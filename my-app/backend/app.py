from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 5432))
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '123')
DB_NAME = os.getenv('DB_NAME', '3d_printing')

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        connect_timeout=5,
    )

def ensure_users_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;')
        conn.commit()

def ensure_executors_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS executors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        executor_type TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        organization_name TEXT,
        organization_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()

def ensure_orders_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service TEXT NOT NULL,
        details TEXT NOT NULL,
        budget NUMERIC(12, 2) NOT NULL,
        deadline DATE NOT NULL,
        file_name TEXT,
        file_data TEXT,
        status TEXT NOT NULL DEFAULT 'Ожидает',
        accepted_executor_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        CHECK (status IN ('Ожидает', 'Выполняется', 'Изготовка изделия', 'Готов'))
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS file_data TEXT;')
            cur.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_executor_user_id INTEGER REFERENCES users(id);')
            cur.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS direct_executor_user_id INTEGER REFERENCES users(id);')
            cur.execute('ALTER TABLE orders ADD COLUMN IF NOT EXISTS decline_reason TEXT;')
            cur.execute(
                '''
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
                        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
                    END IF;
                END $$;
                '''
            )
            cur.execute(
                '''
                ALTER TABLE orders
                ADD CONSTRAINT orders_status_check
                CHECK (status IN (
                    'Ожидает', 'Выполняется', 'Изготовка изделия', 'Готов', 'Отказано'
                ));
                '''
            )
        conn.commit()

def ensure_order_responses_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS order_responses (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        executor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (order_id, executor_user_id)
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()

def ensure_chat_messages_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        file_name TEXT,
        file_data TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute('ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;')
            cur.execute('ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_data TEXT;')
            cur.execute('ALTER TABLE chat_messages ALTER COLUMN content DROP NOT NULL;')
            cur.execute('ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;')
            cur.execute('''
                DO $$
                DECLARE
                    fk_name TEXT;
                BEGIN
                    SELECT conname INTO fk_name
                    FROM pg_constraint
                    WHERE conrelid = 'chat_messages'::regclass
                      AND contype = 'f'
                      AND conkey = ARRAY(
                          SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'chat_messages'::regclass AND attname = 'order_id'
                      );
                    IF fk_name IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE chat_messages DROP CONSTRAINT ' || fk_name;
                    END IF;
                    ALTER TABLE chat_messages
                        ADD CONSTRAINT chat_messages_order_id_fkey
                        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            ''')
        conn.commit()

def ensure_reviews_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        reviewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()

def ensure_executor_cabinet_table():
    sql = '''
    CREATE TABLE IF NOT EXISTS executor_cabinets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        about TEXT,
        services TEXT,
        company_avatar TEXT,
        works TEXT,
        price_range TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
    );
    '''

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute('ALTER TABLE executor_cabinets ADD COLUMN IF NOT EXISTS price_range TEXT;')
        conn.commit()

@app.get('/api/health')
def health():
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT NOW() AS now')
                row = cur.fetchone()
        return jsonify({'ok': True, 'dbTime': row['now']}), 200
    except Exception as error:
        return jsonify({'ok': False, 'error': f'Database connection failed: {str(error)}'}), 500

@app.post('/api/register')
def register():
    payload = request.get_json(silent=True) or {}

    name = payload.get('name', '').strip()
    email = payload.get('email', '').strip().lower()
    password = payload.get('password', '')

    if not name or not email or not password:
        return jsonify({'message': 'name, email and password are required'}), 400

    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    INSERT INTO users (name, email, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, email, created_at
                    ''',
                    (name, email, password_hash),
                )
                user = cur.fetchone()
            conn.commit()

        return jsonify({'user': user}), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({'message': 'Email already exists'}), 409
    except Exception as error:
        return jsonify({'message': f'Registration failed: {str(error)}'}), 500

@app.post('/api/login')
def login():
    payload = request.get_json(silent=True) or {}

    email = payload.get('email', '').strip().lower()
    password = payload.get('password', '')

    if not email or not password:
        return jsonify({'message': 'email and password are required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT id, name, email, password_hash FROM users WHERE email = %s',
                    (email,),
                )
                user = cur.fetchone()

        if user is None:
            return jsonify({'message': 'Invalid email or password'}), 401

        if not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid email or password'}), 401

        return jsonify(
            {
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                }
            }
        ), 200
    except Exception as error:
        return jsonify({'message': f'Login failed: {str(error)}'}), 500

@app.get('/api/users/<int:user_id>')
def get_user(user_id):
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT u.id, u.name, u.email, u.avatar_url, u.created_at,
                           e.executor_type, e.first_name, e.last_name, e.phone,
                           e.organization_name, e.organization_address
                    FROM users u
                    LEFT JOIN executors e ON e.user_id = u.id
                    WHERE u.id = %s
                    ''',
                    (user_id,),
                )
                row = cur.fetchone()

        if row is None:
            return jsonify({'message': 'User not found'}), 404

        executor = None
        if row.get('executor_type'):
            executor = {
                'executor_type': row.get('executor_type'),
                'first_name': row.get('first_name'),
                'last_name': row.get('last_name'),
                'phone': row.get('phone'),
                'organization_name': row.get('organization_name'),
                'organization_address': row.get('organization_address'),
            }

        user = {
            'id': row.get('id'),
            'name': row.get('name'),
            'email': row.get('email'),
            'avatar_url': row.get('avatar_url'),
            'created_at': row.get('created_at'),
        }

        return jsonify({'user': user, 'isExecutor': executor is not None, 'executor': executor}), 200
    except Exception as error:
        return jsonify({'message': f'Get user failed: {str(error)}'}), 500

@app.patch('/api/users/<int:user_id>')
def update_user(user_id):
    payload = request.get_json(silent=True) or {}

    name = (payload.get('name') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    avatar_url = (payload.get('avatarUrl') or '').strip()

    if not name or not email:
        return jsonify({'message': 'name and email are required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    UPDATE users
                    SET name = %s, email = %s, avatar_url = %s
                    WHERE id = %s
                    RETURNING id, name, email, avatar_url, created_at
                    ''',
                    (name, email, avatar_url or None, user_id),
                )
                user = cur.fetchone()
            conn.commit()

        if user is None:
            return jsonify({'message': 'User not found'}), 404

        return jsonify({'user': user}), 200
    except psycopg2.errors.UniqueViolation:
        return jsonify({'message': 'Email already exists'}), 409
    except Exception as error:
        return jsonify({'message': f'Update user failed: {str(error)}'}), 500

@app.post('/api/users/<int:user_id>/password')
def update_password(user_id):
    payload = request.get_json(silent=True) or {}

    current_password = payload.get('currentPassword', '')
    new_password = payload.get('newPassword', '')

    if not current_password or not new_password:
        return jsonify({'message': 'currentPassword and newPassword are required'}), 400

    if len(new_password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT id, password_hash FROM users WHERE id = %s',
                    (user_id,),
                )
                user = cur.fetchone()

                if user is None:
                    return jsonify({'message': 'User not found'}), 404

                if not check_password_hash(user['password_hash'], current_password):
                    return jsonify({'message': 'Current password is incorrect'}), 400

                cur.execute(
                    'UPDATE users SET password_hash = %s WHERE id = %s',
                    (generate_password_hash(new_password), user_id),
                )
            conn.commit()

        return jsonify({'ok': True}), 200
    except Exception as error:
        return jsonify({'message': f'Password update failed: {str(error)}'}), 500

@app.get('/api/executors/list')
def list_executors():
    services     = request.args.getlist('service')
    price_from   = request.args.get('priceFrom', '').strip()
    price_to     = request.args.get('priceTo', '').strip()
    executor_type = request.args.get('executorType', '').strip()
    exclude_user_id = request.args.get('excludeUserId', '').strip()

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT
                        e.user_id,
                        u.name,
                        e.executor_type,
                        e.first_name,
                        e.last_name,
                        e.organization_name,
                        ec.about,
                        ec.services,
                        ec.company_avatar,
                        ec.price_range,
                        ec.works,
                        COALESCE(AVG(r.rating), 0) AS avg_rating,
                        COUNT(r.id) AS review_count
                    FROM executors e
                    JOIN users u ON u.id = e.user_id
                    LEFT JOIN executor_cabinets ec ON ec.user_id = e.user_id
                    LEFT JOIN reviews r ON r.target_user_id = e.user_id
                    GROUP BY e.user_id, u.name, e.executor_type, e.first_name, e.last_name,
                             e.organization_name, ec.about, ec.services, ec.company_avatar,
                             ec.price_range, ec.works, e.created_at
                    ORDER BY e.created_at DESC
                    '''
                )
                rows = cur.fetchall()

        result = []
        for row in rows:

            if exclude_user_id.isdigit() and int(row['user_id']) == int(exclude_user_id):
                continue

            executor_services = json.loads(row['services']) if row.get('services') else []

            executor_service_names = [
                s if isinstance(s, str) else s.get('name', '')
                for s in executor_services
            ]

            if services and not any(s in executor_service_names for s in services):
                continue

            if executor_type and row['executor_type'] != executor_type:
                continue

            price_range = row.get('price_range') or ''
            if price_range and (price_from or price_to):
                parts = price_range.split('-')
                exec_from = int(parts[0]) if parts[0].isdigit() else 0
                exec_to   = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else exec_from
                if price_from and exec_to < int(price_from):
                    continue
                if price_to and exec_from > int(price_to):
                    continue

            result.append({
                'user_id':           row['user_id'],
                'name':              row['name'],
                'executor_type':     row['executor_type'],
                'first_name':        row['first_name'],
                'last_name':         row['last_name'],
                'organization_name': row.get('organization_name') or '',
                'about':             row.get('about') or '',
                'services':          executor_services,
                'company_avatar':    row.get('company_avatar') or '',
                'price_range':       price_range,
                'works':             json.loads(row['works']) if row.get('works') else [],
                'avg_rating':        round(float(row.get('avg_rating') or 0), 1),
                'review_count':      int(row.get('review_count') or 0),
            })

        def sort_key(executor):
            avg_rating   = executor.get('avg_rating', 0)
            review_count = executor.get('review_count', 0)
            services     = executor.get('services', [])
            priced_count = sum(
                1 for s in services
                if isinstance(s, dict) and s.get('price') and str(s['price']).strip()
            )
            has_price = 1 if priced_count > 0 else 0
            return (-avg_rating, -review_count, -has_price, -priced_count)

        result.sort(key=sort_key)

        return jsonify({'executors': result}), 200
    except Exception as error:
        return jsonify({'message': f'List executors failed: {str(error)}'}), 500

@app.get('/api/executors/status')
def executor_status():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT id, user_id, executor_type, first_name, last_name, phone,
                           organization_name, organization_address, created_at
                    FROM executors
                    WHERE user_id = %s
                    ''',
                    (int(user_id),),
                )
                executor = cur.fetchone()

        return jsonify({'isExecutor': executor is not None, 'executor': executor}), 200
    except Exception as error:
        return jsonify({'message': f'Executor status failed: {str(error)}'}), 500

@app.post('/api/executors')
def create_executor():
    payload = request.get_json(silent=True) or {}

    user_id = payload.get('userId')
    executor_type = (payload.get('executorType') or '').strip().lower()
    first_name = (payload.get('firstName') or '').strip()
    last_name = (payload.get('lastName') or '').strip()
    phone = (payload.get('phone') or '').strip()
    organization_name = (payload.get('organizationName') or '').strip()
    organization_address = (payload.get('organizationAddress') or '').strip()
    code = (payload.get('code') or '').strip()

    if code != '1234':
        return jsonify({'message': 'Неверный код подтверждения'}), 400

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    if executor_type not in ('individual', 'organization'):
        return jsonify({'message': 'executorType must be individual or organization'}), 400

    if not first_name or not last_name or not phone:
        return jsonify({'message': 'firstName, lastName and phone are required'}), 400

    if executor_type == 'organization' and (not organization_name or not organization_address):
        return jsonify({'message': 'organizationName and organizationAddress are required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id FROM users WHERE id = %s', (int(user_id),))
                user = cur.fetchone()

                if user is None:
                    return jsonify({'message': 'User not found'}), 404

                cur.execute(
                    '''
                    INSERT INTO executors (
                        user_id,
                        executor_type,
                        first_name,
                        last_name,
                        phone,
                        organization_name,
                        organization_address
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, user_id, executor_type, first_name, last_name, phone,
                              organization_name, organization_address, created_at
                    ''',
                    (
                        int(user_id),
                        executor_type,
                        first_name,
                        last_name,
                        phone,
                        organization_name if executor_type == 'organization' else None,
                        organization_address if executor_type == 'organization' else None,
                    ),
                )
                executor = cur.fetchone()
            conn.commit()

        return jsonify({'executor': executor}), 201
    except psycopg2.errors.UniqueViolation:
        return jsonify({'message': 'Executor already exists'}), 409
    except Exception as error:
        return jsonify({'message': f'Executor creation failed: {str(error)}'}), 500

@app.put('/api/executors')
def update_executor():
    payload = request.get_json(silent=True) or {}

    user_id = payload.get('userId')
    executor_type = (payload.get('executorType') or '').strip().lower()
    first_name = (payload.get('firstName') or '').strip()
    last_name = (payload.get('lastName') or '').strip()
    phone = (payload.get('phone') or '').strip()
    organization_name = (payload.get('organizationName') or '').strip()
    organization_address = (payload.get('organizationAddress') or '').strip()

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    if executor_type not in ('individual', 'organization'):
        return jsonify({'message': 'executorType must be individual or organization'}), 400

    if not first_name or not last_name or not phone:
        return jsonify({'message': 'firstName, lastName and phone are required'}), 400

    if executor_type == 'organization' and (not organization_name or not organization_address):
        return jsonify({'message': 'organizationName and organizationAddress are required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id FROM executors WHERE user_id = %s', (int(user_id),))
                row = cur.fetchone()
                if row is None:
                    return jsonify({'message': 'Executor not found'}), 404

                cur.execute(
                    '''
                    UPDATE executors
                    SET executor_type = %s,
                        first_name = %s,
                        last_name = %s,
                        phone = %s,
                        organization_name = %s,
                        organization_address = %s
                    WHERE user_id = %s
                    RETURNING id, user_id, executor_type, first_name, last_name, phone,
                              organization_name, organization_address, created_at
                    ''',
                    (
                        executor_type,
                        first_name,
                        last_name,
                        phone,
                        organization_name if executor_type == 'organization' else None,
                        organization_address if executor_type == 'organization' else None,
                        int(user_id),
                    ),
                )
                executor = cur.fetchone()
            conn.commit()

        return jsonify({'executor': executor}), 200
    except Exception as error:
        return jsonify({'message': f'Executor update failed: {str(error)}'}), 500

@app.get('/api/orders/executor')
def list_executor_orders():
    """... ..., ... ... ... ... ... ...."""
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT DISTINCT
                        o.id, o.user_id, o.service, o.details, o.budget, o.deadline,
                        o.file_name, o.file_data, o.status, o.accepted_executor_user_id,
                        o.direct_executor_user_id, o.created_at,
                        cu.name AS customer_name,
                        e.executor_type AS accepted_executor_type,
                        e.first_name AS accepted_executor_first_name,
                        e.last_name AS accepted_executor_last_name,
                        e.organization_name AS accepted_executor_org_name,
                        CASE WHEN o.accepted_executor_user_id = %s THEN true ELSE false END AS is_accepted
                    FROM orders o
                    JOIN users cu ON cu.id = o.user_id
                    LEFT JOIN executors e ON e.user_id = o.accepted_executor_user_id
                    WHERE (
                        EXISTS (
                            SELECT 1 FROM order_responses r
                            WHERE r.order_id = o.id AND r.executor_user_id = %s
                        )
                        OR o.accepted_executor_user_id = %s
                    )
                    AND o.user_id <> %s
                    AND (
                        o.accepted_executor_user_id IS NULL
                        OR o.accepted_executor_user_id = %s
                    )
                    ORDER BY o.created_at DESC
                    ''',
                    (int(user_id), int(user_id), int(user_id), int(user_id), int(user_id)),
                )
                orders = cur.fetchall()

        return jsonify({'orders': orders}), 200
    except Exception as error:
        return jsonify({'message': f'List executor orders failed: {str(error)}'}), 500

@app.get('/api/orders')
def list_orders():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT o.id, o.user_id, o.service, o.details, o.budget, o.deadline, o.file_name, o.file_data,
                           o.status, o.accepted_executor_user_id, o.direct_executor_user_id, o.decline_reason, o.created_at,
                           u.name AS accepted_executor_name,
                           e.executor_type AS accepted_executor_type,
                           e.first_name AS accepted_executor_first_name,
                           e.last_name AS accepted_executor_last_name,
                           e.organization_name AS accepted_executor_org_name,
                           du.name AS direct_executor_name
                    FROM orders o
                    LEFT JOIN users u ON u.id = o.accepted_executor_user_id
                    LEFT JOIN executors e ON e.user_id = o.accepted_executor_user_id
                    LEFT JOIN users du ON du.id = o.direct_executor_user_id
                    WHERE o.user_id = %s
                    ORDER BY o.created_at DESC
                    ''',
                    (int(user_id),),
                )
                orders = cur.fetchall()

        return jsonify({'orders': orders}), 200
    except Exception as error:
        return jsonify({'message': f'List orders failed: {str(error)}'}), 500

@app.get('/api/orders/all')
def list_all_orders():
    exclude_user_id = request.args.get('excludeUserId', '').strip()
    executor_user_id = request.args.get('executorUserId', '').strip()

    hidden_statuses = (
        'Изготовка изделия',
        'Готов',
        'Отказано',
    )

    try:
        executor_services = []

        if executor_user_id.isdigit():
            try:
                with get_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            'SELECT services FROM executor_cabinets WHERE user_id = %s',
                            (int(executor_user_id),),
                        )
                        row = cur.fetchone()
                        if row and row.get('services'):
                            raw = json.loads(row['services'])
                            executor_services = [
                                s if isinstance(s, str) else s.get('name', '')
                                for s in raw
                                if (s if isinstance(s, str) else s.get('name', ''))
                            ]
            except Exception:
                executor_services = []

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if exclude_user_id.isdigit():
                    cur.execute(
                        '''
                        SELECT o.id, o.user_id, u.name AS user_name, o.service, o.details, o.budget,
                               o.deadline, o.file_name, o.file_data, o.status, o.accepted_executor_user_id, o.created_at,
                               EXISTS (
                                   SELECT 1 FROM order_responses r
                                   WHERE r.order_id = o.id AND r.executor_user_id = %s
                               ) AS has_responded
                        FROM orders o
                        JOIN users u ON u.id = o.user_id
                        WHERE o.user_id <> %s
                          AND o.status NOT IN %s
                        ORDER BY o.created_at DESC
                        ''',
                        (int(exclude_user_id), int(exclude_user_id), hidden_statuses),
                    )
                else:
                    cur.execute(
                        '''
                        SELECT o.id, o.user_id, u.name AS user_name, o.service, o.details, o.budget,
                               o.deadline, o.file_name, o.file_data, o.status, o.accepted_executor_user_id, o.created_at,
                               FALSE AS has_responded
                        FROM orders o
                        JOIN users u ON u.id = o.user_id
                        WHERE o.status NOT IN %s
                        ORDER BY o.created_at DESC
                        ''',
                        (hidden_statuses,),
                    )
                orders = cur.fetchall()

        if executor_services:
            orders = [o for o in orders if o.get('service') in executor_services]

        return jsonify({'orders': orders}), 200
    except Exception as error:
        return jsonify({'message': f'List all orders failed: {str(error)}'}), 500

@app.post('/api/orders/respond')
def respond_to_order():
    payload = request.get_json(silent=True) or {}
    order_id = payload.get('orderId')
    user_id = payload.get('userId')

    if order_id is None or not str(order_id).isdigit():
        return jsonify({'message': 'orderId is required'}), 400

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT id, user_id, accepted_executor_user_id FROM orders WHERE id = %s',
                    (int(order_id),),
                )
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                if int(order['user_id']) == int(user_id):
                    return jsonify({'message': '... ... ... ... ...'}), 400

                cur.execute('SELECT id FROM executors WHERE user_id = %s', (int(user_id),))
                executor = cur.fetchone()

                if executor is None:
                    return jsonify({'message': 'Executor not found'}), 403

                cur.execute(
                    '''
                    INSERT INTO order_responses (order_id, executor_user_id)
                    VALUES (%s, %s)
                    ON CONFLICT (order_id, executor_user_id) DO NOTHING
                    RETURNING id, order_id, executor_user_id, created_at
                    ''',
                    (int(order_id), int(user_id)),
                )
                response_row = cur.fetchone()
            conn.commit()

        return jsonify({'response': response_row, 'ok': True}), 201
    except Exception as error:
        return jsonify({'message': f'Respond to order failed: {str(error)}'}), 500

@app.post('/api/orders/accept')
def accept_order_executor():
    payload = request.get_json(silent=True) or {}
    order_id = payload.get('orderId')
    user_id = payload.get('userId')
    executor_user_id = payload.get('executorUserId')

    if order_id is None or not str(order_id).isdigit():
        return jsonify({'message': 'orderId is required'}), 400

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    if executor_user_id is None or not str(executor_user_id).isdigit():
        return jsonify({'message': 'executorUserId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id, user_id, status FROM orders WHERE id = %s', (int(order_id),))
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                if int(order['user_id']) != int(user_id):
                    return jsonify({'message': 'Not allowed'}), 403

                cur.execute(
                    '''
                    SELECT id FROM order_responses
                    WHERE order_id = %s AND executor_user_id = %s
                    ''',
                    (int(order_id), int(executor_user_id)),
                )
                response_row = cur.fetchone()

                if response_row is None:
                    return jsonify({'message': 'Response not found'}), 404

                cur.execute(
                    '''
                    UPDATE orders
                    SET status = 'Изготовка изделия', accepted_executor_user_id = %s
                    WHERE id = %s
                    RETURNING id, user_id, status, accepted_executor_user_id
                    ''',
                    (int(executor_user_id), int(order_id)),
                )
                updated = cur.fetchone()
            conn.commit()

        return jsonify({'order': updated}), 200
    except Exception as error:
        return jsonify({'message': f'Accept order failed: {str(error)}'}), 500

@app.post('/api/orders/complete')
def complete_order():
    payload = request.get_json(silent=True) or {}
    order_id = payload.get('orderId')
    user_id = payload.get('userId')

    if order_id is None or not str(order_id).isdigit():
        return jsonify({'message': 'orderId is required'}), 400

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id, user_id, status FROM orders WHERE id = %s', (int(order_id),))
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                if int(order['user_id']) != int(user_id):
                    return jsonify({'message': 'Not allowed'}), 403

                cur.execute(
                    '''
                    UPDATE orders
                    SET status = 'Готов'
                    WHERE id = %s
                    RETURNING id, user_id, status
                    ''',
                    (int(order_id),),
                )
                updated = cur.fetchone()
            conn.commit()

        return jsonify({'order': updated}), 200
    except Exception as error:
        return jsonify({'message': f'Complete order failed: {str(error)}'}), 500

@app.delete('/api/orders/<int:order_id>')
def delete_order(order_id):
    payload = request.get_json(silent=True) or {}
    user_id = request.args.get('userId') or payload.get('userId')

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id, user_id, status FROM orders WHERE id = %s', (int(order_id),))
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                if int(order['user_id']) != int(user_id):
                    return jsonify({'message': 'Forbidden'}), 403

                if order.get('status') != 'Ожидает':
                    return jsonify({'message': 'Only pending orders can be deleted'}), 400

                cur.execute('DELETE FROM chat_messages WHERE order_id = %s', (int(order_id),))
                cur.execute('DELETE FROM order_responses WHERE order_id = %s', (int(order_id),))
                cur.execute('DELETE FROM orders WHERE id = %s', (int(order_id),))
            conn.commit()

        return jsonify({'message': 'Order deleted'}), 200
    except Exception as error:
        return jsonify({'message': f'Delete order failed: {str(error)}'}), 500

@app.post('/api/orders/<int:order_id>/decline')
def decline_order(order_id):
    """... ... ... ... ... ... ... ... ... ...."""
    payload = request.get_json(silent=True) or {}
    executor_user_id = payload.get('executorUserId')
    reason = (payload.get('reason') or '').strip()

    if executor_user_id is None:
        return jsonify({'message': 'executorUserId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT id, user_id, direct_executor_user_id, status FROM orders WHERE id = %s',
                    (int(order_id),),
                )
                order = cur.fetchone()

                if not order:
                    return jsonify({'message': 'Order not found'}), 404

                if int(order.get('direct_executor_user_id') or 0) != int(executor_user_id):
                    return jsonify({'message': 'Not allowed'}), 403

                if order['status'] != 'Ожидает':
                    return jsonify({'message': 'Only pending orders can be declined'}), 400

                cur.execute(
                    "UPDATE orders SET status = 'Отказано', decline_reason = %s WHERE id = %s",
                    (reason or None, int(order_id)),
                )
            conn.commit()

        return jsonify({'ok': True}), 200
    except Exception as error:
        return jsonify({'message': f'Decline order failed: {str(error)}'}), 500

@app.get('/api/orders/responses')
def list_order_responses():
    order_id = request.args.get('orderId', '').strip()

    if not order_id.isdigit():
        return jsonify({'message': 'orderId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT r.id, r.order_id, r.executor_user_id, r.created_at,
                           u.name AS user_name, e.executor_type, e.first_name, e.last_name, e.phone
                    FROM order_responses r
                    JOIN users u ON u.id = r.executor_user_id
                    JOIN executors e ON e.user_id = r.executor_user_id
                    WHERE r.order_id = %s
                    ORDER BY r.created_at DESC
                    ''',
                    (int(order_id),),
                )
                responses = cur.fetchall()

        return jsonify({'responses': responses}), 200
    except Exception as error:
        return jsonify({'message': f'List order responses failed: {str(error)}'}), 500

@app.get('/api/orders/responses/counts')
def list_order_response_counts():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT o.id AS order_id, COUNT(r.id) AS response_count
                    FROM orders o
                    LEFT JOIN order_responses r ON r.order_id = o.id
                    WHERE o.user_id = %s
                    GROUP BY o.id
                    ''',
                    (int(user_id),),
                )
                rows = cur.fetchall()

        return jsonify({'counts': rows}), 200
    except Exception as error:
        return jsonify({'message': f'List response counts failed: {str(error)}'}), 500

@app.get('/api/reviews')
def list_reviews():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT r.id, r.reviewer_user_id, r.target_user_id, r.order_id, r.rating, r.text, r.created_at,
                           u.name AS reviewer_name
                    FROM reviews r
                    JOIN users u ON u.id = r.reviewer_user_id
                    WHERE r.target_user_id = %s
                    ORDER BY r.created_at DESC
                    ''',
                    (int(user_id),),
                )
                reviews = cur.fetchall()

        return jsonify({'reviews': reviews}), 200
    except Exception as error:
        return jsonify({'message': f'List reviews failed: {str(error)}'}), 500

@app.post('/api/reviews')
def create_review():
    payload = request.get_json(silent=True) or {}
    reviewer_user_id = payload.get('reviewerUserId')
    target_user_id = payload.get('targetUserId')
    order_id = payload.get('orderId')
    rating = payload.get('rating')
    text = (payload.get('text') or '').strip()

    if reviewer_user_id is None or not str(reviewer_user_id).isdigit():
        return jsonify({'message': 'reviewerUserId is required'}), 400

    if target_user_id is None or not str(target_user_id).isdigit():
        return jsonify({'message': 'targetUserId is required'}), 400

    if str(reviewer_user_id) == str(target_user_id):
        return jsonify({'message': 'You cannot review yourself'}), 400

    if rating is None or not str(rating).isdigit():
        return jsonify({'message': 'rating is required'}), 400

    rating_value = int(rating)
    if rating_value < 1 or rating_value > 5:
        return jsonify({'message': 'rating must be between 1 and 5'}), 400

    if not text:
        return jsonify({'message': 'text is required'}), 400

    if order_id is not None and str(order_id).isdigit() is False:
        return jsonify({'message': 'orderId must be numeric'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    INSERT INTO reviews (reviewer_user_id, target_user_id, order_id, rating, text)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, reviewer_user_id, target_user_id, order_id, rating, text, created_at
                    ''',
                    (
                        int(reviewer_user_id),
                        int(target_user_id),
                        int(order_id) if order_id is not None else None,
                        rating_value,
                        text,
                    ),
                )
                review = cur.fetchone()

                cur.execute('SELECT name FROM users WHERE id = %s', (int(reviewer_user_id),))
                reviewer = cur.fetchone()
                if review is not None:
                    review['reviewer_name'] = reviewer.get('name') if reviewer else None
            conn.commit()

        return jsonify({'review': review}), 201
    except Exception as error:
        return jsonify({'message': f'Create review failed: {str(error)}'}), 500

@app.get('/api/executors/cabinet')
def get_executor_cabinet():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    SELECT user_id, about, services, company_avatar, works, price_range, updated_at
                    FROM executor_cabinets
                    WHERE user_id = %s
                    ''',
                    (int(user_id),),
                )
                row = cur.fetchone()

        if row is None:
            return jsonify({'cabinet': None}), 200

        cabinet = {
            'user_id': row.get('user_id'),
            'about': row.get('about') or '',
            'services': json.loads(row['services']) if row.get('services') else [],
            'companyAvatar': row.get('company_avatar') or '',
            'works': json.loads(row['works']) if row.get('works') else [],
            'priceRange': row.get('price_range') or '',
            'updated_at': row.get('updated_at'),
        }

        return jsonify({'cabinet': cabinet}), 200
    except Exception as error:
        return jsonify({'message': f'Get cabinet failed: {str(error)}'}), 500

@app.put('/api/executors/cabinet')
def upsert_executor_cabinet():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get('userId')
    about = (payload.get('about') or '').strip()
    services = payload.get('services') or []
    company_avatar = (payload.get('companyAvatar') or '').strip()
    works = payload.get('works') or []
    price_range = (payload.get('priceRange') or '').strip()

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    if not isinstance(services, list):
        return jsonify({'message': 'services must be a list'}), 400

    if not isinstance(works, list):
        return jsonify({'message': 'works must be a list'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id FROM executors WHERE user_id = %s', (int(user_id),))
                executor = cur.fetchone()
                if executor is None:
                    return jsonify({'message': 'Executor not found'}), 403

                cur.execute(
                    '''
                    INSERT INTO executor_cabinets (user_id, about, services, company_avatar, works, price_range)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        about = EXCLUDED.about,
                        services = EXCLUDED.services,
                        company_avatar = EXCLUDED.company_avatar,
                        works = EXCLUDED.works,
                        price_range = EXCLUDED.price_range,
                        updated_at = NOW()
                    RETURNING user_id, about, services, company_avatar, works, price_range, updated_at
                    ''',
                    (
                        int(user_id),
                        about or None,
                        json.dumps(services, ensure_ascii=False),
                        company_avatar or None,
                        json.dumps(works, ensure_ascii=False),
                        price_range or None,
                    ),
                )
                row = cur.fetchone()
            conn.commit()

        cabinet = {
            'user_id': row.get('user_id'),
            'about': row.get('about') or '',
            'services': json.loads(row['services']) if row.get('services') else [],
            'companyAvatar': row.get('company_avatar') or '',
            'works': json.loads(row['works']) if row.get('works') else [],
            'priceRange': row.get('price_range') or '',
            'updated_at': row.get('updated_at'),
        }

        return jsonify({'cabinet': cabinet}), 200
    except Exception as error:
        return jsonify({'message': f'Save cabinet failed: {str(error)}'}), 500

@app.get('/api/chats/messages')
def list_chat_messages():
    order_id = request.args.get('orderId', '').strip()
    user_id = request.args.get('userId', '').strip()
    peer_id = request.args.get('peerId', '').strip()

    if not order_id.isdigit() or not user_id.isdigit() or not peer_id.isdigit():
        return jsonify({'message': 'orderId, userId, peerId are required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id, user_id FROM orders WHERE id = %s', (int(order_id),))
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                cur.execute(
                    '''
                    SELECT id, order_id, sender_user_id, recipient_user_id, content, file_name, file_data, created_at
                    FROM chat_messages
                    WHERE order_id = %s
                      AND ((sender_user_id = %s AND recipient_user_id = %s)
                        OR (sender_user_id = %s AND recipient_user_id = %s))
                    ORDER BY created_at ASC
                    ''',
                    (int(order_id), int(user_id), int(peer_id), int(peer_id), int(user_id)),
                )
                messages = cur.fetchall()

        return jsonify({'messages': messages}), 200
    except Exception as error:
        return jsonify({'message': f'List chat messages failed: {str(error)}'}), 500

@app.post('/api/chats/read')
def mark_messages_read():
    """... ... ... ... ... ... ... ... ...."""
    payload = request.get_json(silent=True) or {}
    order_id = payload.get('orderId')
    user_id = payload.get('userId')

    if not order_id or not user_id:
        return jsonify({'ok': False}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''
                    UPDATE chat_messages
                    SET is_read = TRUE
                    WHERE order_id = %s AND recipient_user_id = %s AND is_read = FALSE
                    ''',
                    (int(order_id), int(user_id)),
                )
            conn.commit()
        return jsonify({'ok': True}), 200
    except Exception as error:
        return jsonify({'message': f'Mark read failed: {str(error)}'}), 500

@app.post('/api/chats/messages')
def create_chat_message():
    payload = request.get_json(silent=True) or {}
    order_id = payload.get('orderId')
    sender_id = payload.get('senderId')
    recipient_id = payload.get('recipientId')
    content = (payload.get('content') or '').strip()
    file_name = (payload.get('fileName') or '').strip()
    file_data = (payload.get('fileData') or '').strip()

    if order_id is None or not str(order_id).isdigit():
        return jsonify({'message': 'orderId is required'}), 400

    if sender_id is None or not str(sender_id).isdigit():
        return jsonify({'message': 'senderId is required'}), 400

    if recipient_id is None or not str(recipient_id).isdigit():
        return jsonify({'message': 'recipientId is required'}), 400

    if not content and not file_data:
        return jsonify({'message': 'content or file is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    'SELECT id, user_id, accepted_executor_user_id FROM orders WHERE id = %s',
                    (int(order_id),),
                )
                order = cur.fetchone()

                if order is None:
                    return jsonify({'message': 'Order not found'}), 404

                cur.execute(
                    '''
                    SELECT id FROM order_responses
                    WHERE order_id = %s AND executor_user_id = %s
                    ''',
                    (int(order_id), int(sender_id)),
                )
                response_row = cur.fetchone()

                if int(order['user_id']) != int(sender_id) and not response_row:
                    return jsonify({'message': 'Not allowed'}), 403

                if (
                    order.get('accepted_executor_user_id') is not None
                    and int(order['user_id']) != int(sender_id)
                    and int(order['accepted_executor_user_id']) != int(sender_id)
                ):
                    return jsonify({'message': '... ... ... ...'}), 403

                cur.execute(
                    '''
                    INSERT INTO chat_messages (order_id, sender_user_id, recipient_user_id, content, file_name, file_data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, order_id, sender_user_id, recipient_user_id, content, file_name, file_data, created_at
                    ''',
                    (int(order_id), int(sender_id), int(recipient_id), content or None, file_name or None, file_data or None),
                )
                message = cur.fetchone()
            conn.commit()

        return jsonify({'message': message}), 201
    except Exception as error:
        return jsonify({'message': f'Create chat message failed: {str(error)}'}), 500

@app.get('/api/chats/threads')
def list_chat_threads():
    user_id = request.args.get('userId', '').strip()

    if not user_id.isdigit():
        return jsonify({'message': 'userId is required'}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    '''
                    WITH my_messages AS (
                        SELECT
                            id,
                            order_id,
                            sender_user_id,
                            recipient_user_id,
                            content,
                            created_at,
                            CASE
                                WHEN sender_user_id = %s THEN recipient_user_id
                                ELSE sender_user_id
                            END AS peer_id
                        FROM chat_messages
                        WHERE sender_user_id = %s OR recipient_user_id = %s
                    ),
                    latest AS (
                        SELECT DISTINCT ON (order_id, peer_id)
                            order_id,
                            peer_id,
                            content AS last_message,
                            created_at AS last_time
                        FROM my_messages
                        ORDER BY order_id, peer_id, created_at DESC
                    )
                    SELECT
                        l.order_id,
                        l.peer_id,
                        u.name AS peer_name,
                        o.service AS order_service,
                        o.status AS order_status,
                        o.user_id AS order_user_id,
                        o.accepted_executor_user_id AS accepted_executor_user_id,
                        l.last_message,
                        l.last_time,
                        (
                            SELECT COUNT(*)
                            FROM chat_messages cm
                            WHERE cm.order_id = l.order_id
                              AND cm.recipient_user_id = %s
                              AND cm.sender_user_id = l.peer_id
                              AND cm.is_read = FALSE
                        ) AS unread_count
                    FROM latest l
                    JOIN users u ON u.id = l.peer_id
                    JOIN orders o ON o.id = l.order_id
                    ORDER BY l.last_time DESC
                    ''',
                    (int(user_id), int(user_id), int(user_id), int(user_id)),
                )
                threads = cur.fetchall()

        return jsonify({'threads': threads}), 200
    except Exception as error:
        return jsonify({'message': f'List chat threads failed: {str(error)}'}), 500

@app.post('/api/orders')
def create_order():
    payload = request.get_json(silent=True) or {}

    user_id = payload.get('userId')
    service = (payload.get('service') or '').strip()
    details = (payload.get('details') or '').strip()
    budget = payload.get('budget')
    deadline = (payload.get('deadline') or '').strip()
    file_name = (payload.get('fileName') or '').strip()
    file_data = (payload.get('fileData') or '').strip()
    direct_executor_user_id = payload.get('directExecutorUserId')

    if user_id is None or not str(user_id).isdigit():
        return jsonify({'message': 'userId is required'}), 400

    if not service or not details or not deadline:
        return jsonify({'message': 'service, details and deadline are required'}), 400

    try:
        budget_value = float(budget)
    except (TypeError, ValueError):
        budget_value = None

    if budget_value is None or budget_value <= 0:
        return jsonify({'message': 'budget must be a positive number'}), 400

    direct_exec_id = int(direct_executor_user_id) if direct_executor_user_id and str(direct_executor_user_id).isdigit() else None

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('SELECT id FROM users WHERE id = %s', (int(user_id),))
                user = cur.fetchone()

                if user is None:
                    return jsonify({'message': 'User not found'}), 404

                cur.execute(
                    '''
                    INSERT INTO orders (user_id, service, details, budget, deadline, file_name, file_data, direct_executor_user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, user_id, service, details, budget, deadline, file_name, file_data, status, direct_executor_user_id, created_at
                    ''',
                    (
                        int(user_id),
                        service,
                        details,
                        budget_value,
                        deadline,
                        file_name or None,
                        file_data or None,
                        direct_exec_id,
                    ),
                )
                order = cur.fetchone()

                if direct_exec_id and order:
                    cur.execute(
                        '''
                        INSERT INTO order_responses (order_id, executor_user_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        ''',
                        (order['id'], direct_exec_id),
                    )
            conn.commit()

        return jsonify({'order': order}), 201
    except Exception as error:
        return jsonify({'message': f'Create order failed: {str(error)}'}), 500

if __name__ == '__main__':
    ensure_users_table()
    ensure_executors_table()
    ensure_orders_table()
    ensure_order_responses_table()
    ensure_chat_messages_table()
    ensure_reviews_table()
    ensure_executor_cabinet_table()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
