import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import './Profile.css';
import './ExecutorCabinet.css';

const goTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
};

const statusClassMap = {
  'Ожидает': 'pending',
  'Выполняется': 'progress',
  'Изготовка изделия': 'inwork',
  'Готов': 'done',
};

const catalogServices = [
  'Прототипирование изделий',
  '3D-моделирование с нуля',
  'Мелкосерийное производство',
  'Функциональные детали',
  'Печать высокоточных моделей',
  'Крупногабаритная печать',
];

const getOrderExecutorLabel = (order) => {
  if (!order) return '';
  if (order.accepted_executor_type === 'organization') {
    return order.accepted_executor_org_name || order.accepted_executor_name || 'Организация';
  }

  const personName = [order.accepted_executor_first_name, order.accepted_executor_last_name]
    .filter(Boolean)
    .join(' ');
  return personName || order.accepted_executor_name || '';
};

const getTabFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'orders') return 'orders';
  if (tab === 'executor') return 'executor';
  if (tab === 'market') return 'market';
  if (tab === 'chats') return 'chats';
  return 'about';
};

const Profile = () => {
  const user = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [form, setForm] = useState({ name: '', email: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(getTabFromLocation());
  const [orders, setOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersMessage, setOrdersMessage] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('Файл не выбран (необязательно)');
  const [selectedFileData, setSelectedFileData] = useState('');
  const [orderForm, setOrderForm] = useState({
    service: '',
    details: '',
    budget: '',
    deadline: '',
  });
  const [orderErrors, setOrderErrors] = useState({});
  const [executor, setExecutor] = useState(null);
  const [executorForm, setExecutorForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    executorType: 'individual',
    organizationName: '',
    organizationAddress: '',
  });
  const [executorFormMessage, setExecutorFormMessage] = useState('');
  const [isExecutorFormError, setIsExecutorFormError] = useState(false);
  const [isExecutorSaving, setIsExecutorSaving] = useState(false);
  const [isExecutorLoading, setIsExecutorLoading] = useState(false);
  const [executorMessage, setExecutorMessage] = useState('');
  const [marketOrders, setMarketOrders] = useState([]);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [marketMessage, setMarketMessage] = useState('');
  const [responseCounts, setResponseCounts] = useState({});
  const [responsesModal, setResponsesModal] = useState({
    open: false,
    orderId: null,
    orderTitle: '',
    orderStatus: '',
  });
  const [responsesList, setResponsesList] = useState([]);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [responsesMessage, setResponsesMessage] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatFileName, setChatFileName] = useState('');
  const [chatFileData, setChatFileData] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatBodyRef = useRef(null);
  const chatBodyModalRef = useRef(null);
  const [previewFile, setPreviewFile] = useState({ open: false, name: '', data: '' });
  const [chatThreads, setChatThreads] = useState([]);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [threadsMessage, setThreadsMessage] = useState('');
  const [chatMode, setChatMode] = useState('executor');
  const [profileReviews, setProfileReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsMessage, setReviewsMessage] = useState('');
  const [cabinetForm, setCabinetForm] = useState({
    about: '',
    services: [],
    companyAvatar: '',
    works: [],
  });
  const [cabinetMessage, setCabinetMessage] = useState('');
  const [isCabinetError, setIsCabinetError] = useState(false);

  const isChatLockedForUser = (orderUserId, acceptedExecutorUserId) => {
    if (!user?.id) return false;
    if (!acceptedExecutorUserId) return false;
    if (Number(orderUserId) === Number(user.id)) return false;
    return Number(acceptedExecutorUserId) !== Number(user.id);
  };

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}`);
        const data = await response.json();
        if (response.ok && data.user) {
          setForm({
            name: data.user.name || '',
            email: data.user.email || '',
            avatarUrl: data.user.avatar_url || '',
          });
        }
      } catch {

      }
    };

    loadProfile();
    loadExecutor();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const loadCabinet = async () => {
      try {
        const response = await fetch(`/api/executors/cabinet?userId=${user.id}`);
        const data = await response.json();
        if (response.ok && data.cabinet) {
          setCabinetForm({
            about: data.cabinet.about || '',
            services: Array.isArray(data.cabinet.services) ? data.cabinet.services : [],
            companyAvatar: data.cabinet.companyAvatar || '',
            works: Array.isArray(data.cabinet.works) ? data.cabinet.works : [],
          });
        }
      } catch {

      }
    };

    loadCabinet();
  }, [user]);

  const loadExecutor = async () => {
    if (!user?.id) return;

    setIsExecutorLoading(true);
    setExecutorMessage('');

    try {
      const response = await fetch(`/api/executors/status?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки профиля исполнителя (HTTP ${response.status})`);
      }

      setExecutor(data.executor || null);
    } catch (error) {
      setExecutorMessage(error.message || 'Ошибка загрузки профиля исполнителя');
    } finally {
      setIsExecutorLoading(false);
    }
  };

  useEffect(() => {
    if (!executor) return;

    setExecutorForm({
      firstName: executor.first_name || '',
      lastName: executor.last_name || '',
      phone: executor.phone || '',
      executorType: executor.executor_type || 'individual',
      organizationName: executor.organization_name || '',
      organizationAddress: executor.organization_address || '',
    });
  }, [executor]);

  const saveExecutor = async () => {
    if (!user?.id) return;

    setIsExecutorSaving(true);
    setExecutorFormMessage('');
    setIsExecutorFormError(false);

    const firstName = (executorForm.firstName || '').trim();
    const lastName = (executorForm.lastName || '').trim();
    const phone = (executorForm.phone || '').trim();
    const executorType = (executorForm.executorType || 'individual').trim();
    const organizationName = (executorForm.organizationName || '').trim();
    const organizationAddress = (executorForm.organizationAddress || '').trim();

    if (!firstName || !lastName || !phone) {
      setExecutorFormMessage('Имя, фамилия и телефон обязательны.');
      setIsExecutorFormError(true);
      setIsExecutorSaving(false);
      return false;
    }

    if (executorType === 'organization' && (!organizationName || !organizationAddress)) {
      setExecutorFormMessage('Для организации нужны название и адрес.');
      setIsExecutorFormError(true);
      setIsExecutorSaving(false);
      return false;
    }

    try {
      const response = await fetch('/api/executors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          executorType,
          firstName,
          lastName,
          phone,
          organizationName,
          organizationAddress,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка сохранения профиля (HTTP ${response.status})`);
      }

      setExecutor(data.executor || null);
      setExecutorFormMessage('Профиль исполнителя сохранен успешно.');
      setIsExecutorFormError(false);
      return true;
    } catch (error) {
      setExecutorFormMessage(error.message || 'Ошибка сохранения профиля исполнителя');
      setIsExecutorFormError(true);
      return false;
    } finally {
      setIsExecutorSaving(false);
    }
  };

  const saveExecutorAndCabinet = async () => {
    const executorOk = await saveExecutor();
    await saveCabinet();
    return executorOk;
  };

  const loadMarketOrders = async () => {
    setIsMarketLoading(true);
    setMarketMessage('');

    try {
      const response = await fetch(`/api/orders/all?excludeUserId=${user?.id || ''}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки заказов (HTTP ${response.status})`);
      }

      setMarketOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      setMarketMessage(error.message || 'Ошибка загрузки заказов');
    } finally {
      setIsMarketLoading(false);
    }
  };

  const loadResponseCounts = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/orders/responses/counts?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки откликов (HTTP ${response.status})`);
      }

      const nextCounts = {};
      (data.counts || []).forEach((row) => {
        nextCounts[String(row.order_id)] = Number(row.response_count) || 0;
      });
      setResponseCounts(nextCounts);
    } catch {

    }
  };

  const openResponsesModal = async (orderId, orderTitle, orderStatus) => {
    setResponsesModal({ open: true, orderId, orderTitle, orderStatus: orderStatus || '' });
    setIsResponsesLoading(true);
    setResponsesMessage('');

    try {
      const response = await fetch(`/api/orders/responses?orderId=${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки откликов (HTTP ${response.status})`);
      }

      setResponsesList(Array.isArray(data.responses) ? data.responses : []);
    } catch (error) {
      setResponsesMessage(error.message || 'Ошибка загрузки откликов');
    } finally {
      setIsResponsesLoading(false);
    }
  };

  const respondToOrder = async (orderId, customerId, customerName, orderStatus) => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/orders/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId: user.id }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Ошибка отклика (HTTP ${response.status})`);
      }

      setActiveChat({
        orderId,
        peerId: customerId,
        peerName: customerName || 'Заказчик',
        orderStatus: orderStatus || '',
        orderUserId: customerId,
        acceptedExecutorUserId: null,
      });
      await loadChatMessages(orderId, customerId);
    } catch (error) {
      setMarketMessage(error.message || 'Ошибка отклика');
    }
  };

  const acceptExecutorForOrder = async (orderId, executorUserId) => {
    if (!user?.id) return;

    const shouldAccept = window.confirm('Точно принять работу этого исполнителя?');
    if (!shouldAccept) return;

    try {
      const response = await fetch('/api/orders/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          executorUserId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка принятия (HTTP ${response.status})`);
      }

      await loadOrders();
      setResponsesModal({ open: false, orderId: null, orderTitle: '', orderStatus: '' });
    } catch (error) {
      setResponsesMessage(error.message || 'Ошибка принятия');
    }
  };

  const completeOrder = async (orderId) => {
    if (!user?.id) return;

    const shouldConfirm = window.confirm('Точно подтвердить выполнение заказа?');
    if (!shouldConfirm) return;

    try {
      const response = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка подтверждения (HTTP ${response.status})`);
      }

      await loadOrders();
    } catch (error) {
      setOrdersMessage(error.message || 'Ошибка подтверждения');
    }
  };

  const openChatWithResponder = async (
    orderId,
    responderId,
    responderName,
    orderStatus,
    orderUserId,
    acceptedExecutorUserId,
  ) => {
    setActiveChat({
      orderId,
      peerId: responderId,
      peerName: responderName || 'Исполнитель',
      orderStatus: orderStatus || '',
      orderUserId: orderUserId || null,
      acceptedExecutorUserId: acceptedExecutorUserId || null,
    });
    await loadChatMessages(orderId, responderId);
  };

  const loadChatMessages = async (orderId, peerId) => {
    if (!user?.id) return;

    setIsChatLoading(true);
    setChatError('');

    try {
      const response = await fetch(
        `/api/chats/messages?orderId=${orderId}&userId=${user.id}&peerId=${peerId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки чата (HTTP ${response.status})`);
      }

      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      setChatError(error.message || 'Ошибка загрузки чата');
    } finally {
      setIsChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!activeChat || !user?.id) return;
    const content = chatMessage.trim();
    if (!content && !chatFileData) return;

    try {
      const response = await fetch('/api/chats/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeChat.orderId,
          senderId: user.id,
          recipientId: activeChat.peerId,
          content,
          fileName: chatFileName,
          fileData: chatFileData,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка отправки (HTTP ${response.status})`);
      }

      setChatMessage('');
      setChatFileName('');
      setChatFileData('');
      setChatMessages((prev) => [...prev, data.message]);
    } catch (error) {
      setChatError(error.message || 'Ошибка отправки');
    }
  };

  const deleteOrder = async (orderId) => {
    if (!user?.id) return;
    const shouldDelete = window.confirm('Точно удалить этот заказ? Это действие нельзя отменить.');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`/api/orders/${orderId}?userId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Ошибка удаления (HTTP ${response.status})`);
      }

      await loadOrders();
    } catch (error) {
      setOrdersMessage(error.message || 'Ошибка удаления заказа');
    }
  };

  const scrollChatsToBottom = () => {
    [chatBodyRef.current, chatBodyModalRef.current].forEach((node) => {
      if (node) node.scrollTop = node.scrollHeight;
    });
  };

  useEffect(() => {
    if (!activeChat) return;
    requestAnimationFrame(scrollChatsToBottom);
  }, [activeChat, chatMessages]);

  const openPreview = (name, data) => {
    if (!data) return;
    setPreviewFile({ open: true, name: name || 'Файл', data });
  };

  const openUserProfile = (userId) => {
    if (!userId) return;
    goTo(`/user-profile?userId=${userId}`);
  };

  const loadChatThreads = async () => {
    if (!user?.id) return;

    setIsThreadsLoading(true);
    setThreadsMessage('');

    try {
      const response = await fetch(`/api/chats/threads?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки чатов (HTTP ${response.status})`);
      }

      setChatThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch (error) {
      setThreadsMessage(error.message || 'Ошибка загрузки чатов');
    } finally {
      setIsThreadsLoading(false);
    }
  };

  const setTab = (tab) => {
    if (tab !== 'chats') setActiveChat(null);
    setActiveTab(tab);
    const nextUrl = tab === 'about' ? '/profile' : `/profile?tab=${tab}`;
    window.history.pushState({}, '', nextUrl);
    window.dispatchEvent(new Event('app:navigate'));
  };

  useEffect(() => {
    const applyTab = () => {
      const nextTab = getTabFromLocation();
      if (nextTab !== 'chats') setActiveChat(null);
      setActiveTab(nextTab);
      if (nextTab === 'orders') loadOrders();
      if (nextTab === 'executor') loadExecutor();
      if (nextTab === 'market') loadMarketOrders();
      if (nextTab === 'chats') loadChatThreads();
      if (nextTab === 'about') loadProfileReviews();
    };

    applyTab();
    window.addEventListener('app:navigate', applyTab);
    return () => window.removeEventListener('app:navigate', applyTab);
  }, [user]);

  const loadOrders = async () => {
    if (!user?.id) return;

    setIsOrdersLoading(true);
    setOrdersMessage('');

    try {
      const response = await fetch(`/api/orders?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки заказов (HTTP ${response.status})`);
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
      await loadResponseCounts();
    } catch (error) {
      setOrdersMessage(error.message || 'Ошибка загрузки заказов');
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const loadProfileReviews = async () => {
    if (!user?.id) return;

    setIsReviewsLoading(true);
    setReviewsMessage('');

    try {
      const response = await fetch(`/api/reviews?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки отзывов (HTTP ${response.status})`);
      }

      setProfileReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (error) {
      setReviewsMessage(error.message || 'Ошибка загрузки отзывов');
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const handleLogout = () => {
    const shouldLogout = window.confirm('Вы точно хотите выйти с аккаунта?');
    if (!shouldLogout) return;
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth:changed'));
    goTo('/');
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onPasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setIsError(true);
      setMessage('Файл слишком большой. До 1 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('file read error'));
      reader.readAsDataURL(file);
    });

  const toggleCabinetService = (service) => {
    setCabinetForm((prev) => {
      const hasService = prev.services.includes(service);
      const nextServices = hasService
        ? prev.services.filter((item) => item !== service)
        : [...prev.services, service];
      return { ...prev, services: nextServices };
    });
  };

  const onCompanyAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setIsCabinetError(true);
      setCabinetMessage('Файл слишком большой. До 2 МБ.');
      return;
    }

    try {
      const data = await readFileAsDataUrl(file);
      setCabinetForm((prev) => ({ ...prev, companyAvatar: data }));
      setCabinetMessage('');
      setIsCabinetError(false);
    } catch {
      setIsCabinetError(true);
      setCabinetMessage('Не удалось загрузить аватар.');
    }
  };

  const onWorksChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    event.target.value = '';

    const maxWorks = 12;
    const remaining = maxWorks - cabinetForm.works.length;
    if (remaining <= 0) {
      setIsCabinetError(true);
      setCabinetMessage(`Можно добавить до ${maxWorks} фото.`);
      return;
    }

    const selected = files.slice(0, remaining);
    const oversized = selected.find((file) => file.size > 2 * 1024 * 1024);
    if (oversized) {
      setIsCabinetError(true);
      setCabinetMessage('Одно из изображений больше 2 МБ.');
      return;
    }

    try {
      const dataUrls = await Promise.all(selected.map(readFileAsDataUrl));
      const nextWorks = selected.map((file, index) => ({
        name: file.name,
        data: dataUrls[index],
      }));
      setCabinetForm((prev) => ({ ...prev, works: [...prev.works, ...nextWorks] }));
      if (files.length > remaining) {
        setIsCabinetError(true);
        setCabinetMessage(`Можно добавить до ${maxWorks} фото.`);
      } else {
        setCabinetMessage('');
        setIsCabinetError(false);
      }
    } catch {
      setIsCabinetError(true);
      setCabinetMessage('Не удалось загрузить изображения.');
    }
  };

  const removeWork = (index) => {
    setCabinetForm((prev) => ({
      ...prev,
      works: prev.works.filter((_, idx) => idx !== index),
    }));
  };

  const saveCabinet = async () => {
    if (!user?.id) return;
    setIsCabinetError(false);
    setCabinetMessage('');

    try {
      const response = await fetch('/api/executors/cabinet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          about: cabinetForm.about,
          services: cabinetForm.services,
          companyAvatar: cabinetForm.companyAvatar,
          works: cabinetForm.works,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Ошибка сохранения кабинета (HTTP ${response.status})`);
      }

      if (data.cabinet) {
        setCabinetForm({
          about: data.cabinet.about || '',
          services: Array.isArray(data.cabinet.services) ? data.cabinet.services : [],
          companyAvatar: data.cabinet.companyAvatar || '',
          works: Array.isArray(data.cabinet.works) ? data.cabinet.works : [],
        });
      }

      setCabinetMessage('Рабочий кабинет сохранен.');
    } catch (error) {
      setIsCabinetError(true);
      setCabinetMessage(error.message || 'Ошибка сохранения кабинета.');
    }
  };

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          avatarUrl: form.avatarUrl,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка сохранения (HTTP ${response.status})`);
      }

      localStorage.setItem(
        'auth_user',
        JSON.stringify({ id: data.user.id, name: data.user.name, email: data.user.email }),
      );
      window.dispatchEvent(new Event('auth:changed'));
      setMessage('Профиль обновлен.');
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    setIsPasswordError(false);
    setIsPasswordLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка смены пароля (HTTP ${response.status})`);
      }

      setPasswordForm({ currentPassword: '', newPassword: '' });
      setPasswordMessage('Пароль успешно обновлен.');
    } catch (error) {
      setIsPasswordError(true);
      setPasswordMessage(error.message || 'Ошибка смены пароля');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const validateOrderForm = () => {
    const errors = {};
    if (!orderForm.service) errors.service = 'Выберите услугу из каталога';
    if (!orderForm.details.trim()) errors.details = 'Заполните описание задачи';
    if (!orderForm.budget || Number(orderForm.budget) <= 0) errors.budget = 'Укажите корректный бюджет';
    if (!orderForm.deadline) errors.deadline = 'Выберите срок выполнения';
    return errors;
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    const errors = validateOrderForm();
    setOrderErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!user?.id) return;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          service: orderForm.service,
          details: orderForm.details,
          budget: orderForm.budget,
          deadline: orderForm.deadline,
          fileName:
            selectedFileName && selectedFileName !== 'Файл не выбран (необязательно)'
              ? selectedFileName
              : '',
          fileData: selectedFileData,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Ошибка создания заказа (HTTP ${response.status})`);
      }

      setOrderForm({ service: '', details: '', budget: '', deadline: '' });
      setSelectedFileName('Файл не выбран (необязательно)');
      setSelectedFileData('');
      setIsOrderModalOpen(false);
      await loadOrders();
    } catch (error) {
      setOrdersMessage(error.message || 'Ошибка создания заказа');
    }
  };

  const handleOrderFieldChange = (field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
    setOrderErrors((prev) => ({ ...prev, [field]: '' }));
  };

  useEffect(() => {
    if (!executor) setChatMode('customer');
  }, [executor]);

  const filteredChatThreads = useMemo(() => {
    if (!user?.id) return chatThreads;
    if (chatMode === 'executor') {
      return chatThreads.filter(
        (thread) => Number(thread.accepted_executor_user_id) === Number(user.id),
      );
    }
    if (chatMode === 'customer') {
      return chatThreads.filter((thread) => Number(thread.order_user_id) === Number(user.id));
    }
    return chatThreads;
  }, [chatThreads, chatMode, user]);

  if (!user) {
    return (
      <div className="profile-page">
        <Header />
        <main className="profile-main">
          <section className="profile-card">
            <h1>Профиль</h1>
            <p>Вы не авторизованы.</p>
            <button type="button" className="profile-btn" onClick={() => goTo('/login')}>
              Войти
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />
      <main className="profile-main">
        <section className="profile-shell">
          <div className="profile-tabs">
            <button
              type="button"
              className={`profile-tab ${activeTab === 'about' ? 'profile-tab--active' : ''}`}
              onClick={() => setTab('about')}
            >
              Обо мне
            </button>
            <button
              type="button"
              className={`profile-tab ${activeTab === 'orders' ? 'profile-tab--active' : ''}`}
              onClick={() => { setTab('orders'); loadOrders(); }}
            >
              Мои заказы
            </button>
            <button
              type="button"
              className={`profile-tab ${activeTab === 'executor' ? 'profile-tab--active' : ''}`}
              onClick={() => { setTab('executor'); loadExecutor(); }}
            >
              Рабочий кабинет
            </button>
            {executor && (
              <button
                type="button"
                className={`profile-tab ${activeTab === 'market' ? 'profile-tab--active' : ''}`}
                onClick={() => { setTab('market'); loadMarketOrders(); }}
              >
                Найти заказ
              </button>
            )}
            <button
              type="button"
              className={`profile-tab ${activeTab === 'chats' ? 'profile-tab--active' : ''}`}
              onClick={() => { setTab('chats'); loadChatThreads(); }}
            >
              Чаты
            </button>
          </div>

          {/* ===== ВКЛАДКА: РАБОЧИЙ КАБИНЕТ ===== */}
          {activeTab === 'executor' && (
            <section className="profile-card profile-card--executor">
              <div className="executor-page-header">
                <div>
                  <h2>Профиль исполнителя</h2>
                  <p>Заполните кабинет, чтобы заказчики сразу понимали ваш опыт и услуги.</p>
                </div>
              </div>

              {executorMessage && <p className="profile-message profile-message--error">{executorMessage}</p>}

              {isExecutorLoading ? (
                <p className="orders-empty">Проверяем статус исполнителя...</p>
              ) : !executor ? (
                <div className="editor-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <p style={{ fontSize: 15, color: 'var(--ec-text-secondary)', marginBottom: 8 }}>Вы ещё не зарегистрированы как исполнитель.</p>
                  <p style={{ fontSize: 13, color: 'var(--ec-text-muted)' }}>Регистрация доступна через кнопку в хедере «Стать исполнителем».</p>
                </div>
              ) : (
                <div className="executor-layout executor-layout--combined">
                  <div className="executor-editor">
                    <div className="executor-editor__intro">
                      <h3>Аккаунт и рабочий кабинет</h3>
                      <p>Настройте карточку, чтобы заказчик быстро оценил ваши услуги и опыт.</p>
                    </div>

                    {(executorFormMessage || cabinetMessage) && (
                      <div className="executor-editor__alerts">
                        {executorFormMessage && (
                          <p className={`profile-message ${isExecutorFormError ? 'profile-message--error' : 'profile-message--ok'}`}>
                            {executorFormMessage}
                          </p>
                        )}
                        {cabinetMessage && (
                          <p className={`profile-message ${isCabinetError ? 'profile-message--error' : 'profile-message--ok'}`}>
                            {cabinetMessage}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Row 1: Basic info + Brand */}
                    <div className="executor-editor__top">

                      {/* Basic info */}
                      <section className="editor-card">
                        <div className="editor-card__head">
                          <div>
                            <h4>Основная информация</h4>
                            <p>Заполните ключевые данные о себе.</p>
                          </div>
                          <span className="editor-card__badge">О исполнителе</span>
                        </div>
                        <div className="editor-grid">
                          <label className="editor-field">
                            <span>Имя</span>
                            <input className="editor-input" type="text" placeholder="Александр"
                              value={executorForm.firstName}
                              onChange={(e) => setExecutorForm((p) => ({ ...p, firstName: e.target.value }))} />
                          </label>
                          <label className="editor-field">
                            <span>Фамилия</span>
                            <input className="editor-input" type="text" placeholder="Иванов"
                              value={executorForm.lastName}
                              onChange={(e) => setExecutorForm((p) => ({ ...p, lastName: e.target.value }))} />
                          </label>
                          <label className="editor-field">
                            <span>Телефон</span>
                            <input className="editor-input" type="tel" placeholder="+7 (999) 000-00-00"
                              value={executorForm.phone}
                              onChange={(e) => setExecutorForm((p) => ({ ...p, phone: e.target.value }))} />
                          </label>
                          <label className="editor-field">
                            <span>Тип</span>
                            <select className="editor-input" value={executorForm.executorType}
                              onChange={(e) => setExecutorForm((p) => ({ ...p, executorType: e.target.value }))}>
                              <option value="individual">Частный исполнитель</option>
                              <option value="organization">Организация</option>
                            </select>
                          </label>
                          {executorForm.executorType === 'organization' && (
                            <>
                              <label className="editor-field editor-field--full">
                                <span>Название организации</span>
                                <input className="editor-input" type="text" placeholder="ООО «Пример»"
                                  value={executorForm.organizationName}
                                  onChange={(e) => setExecutorForm((p) => ({ ...p, organizationName: e.target.value }))} />
                              </label>
                              <label className="editor-field editor-field--full">
                                <span>Адрес</span>
                                <input className="editor-input" type="text" placeholder="г. Алматы, ул. Примерная, 1"
                                  value={executorForm.organizationAddress}
                                  onChange={(e) => setExecutorForm((p) => ({ ...p, organizationAddress: e.target.value }))} />
                              </label>
                            </>
                          )}
                        </div>
                      </section>

                      {/* Brand / avatar */}
                      <section className="editor-card editor-card--brand">
                        <div className="editor-card__head">
                          <div>
                            <h4>Айдентика</h4>
                            <p>Логотип или аватар команды.</p>
                          </div>
                          <span className="editor-card__badge">Бренд</span>
                        </div>
                        <div className="brand-card">
                          <div className="cabinet-avatar cabinet-avatar--large">
                            {cabinetForm.companyAvatar ? (
                              <img src={cabinetForm.companyAvatar} alt="Компания" />
                            ) : (
                              <div className="cabinet-avatar__placeholder">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="4"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span style={{ marginTop: 6, fontSize: 11 }}>Логотип</span>
                              </div>
                            )}
                          </div>
                          <div className="brand-card__actions">
                            <label className="profile-btn profile-btn--ghost" htmlFor="company-avatar-upload">
                              Загрузить аватар
                            </label>
                            <input id="company-avatar-upload" className="profile-avatar-input"
                              type="file" accept="image/*" onChange={onCompanyAvatarChange} />
                            <small className="profile-note">PNG/JPG, до 2 МБ.</small>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* О себе */}
                    <section className="editor-card">
                      <div className="editor-card__head">
                        <div><h4>О себе</h4><p>Опыт, команда, сильные стороны.</p></div>
                        <span className="editor-card__badge">Описание</span>
                      </div>
                      <label className="editor-field editor-field--full">
                        <textarea className="editor-textarea" rows="5"
                          placeholder="Например: 5 лет в 3D-печати, делаем прототипы и несерийное производство."
                          value={cabinetForm.about}
                          onChange={(e) => setCabinetForm((p) => ({ ...p, about: e.target.value }))} />
                      </label>
                    </section>

                    {/* Каталог услуг */}
                    <section className="editor-card">
                      <div className="editor-card__head">
                        <div><h4>Каталог услуг</h4><p>Выберите услуги, которые вы можете выполнить.</p></div>
                        <span className="editor-card__badge">Услуги</span>
                      </div>
                      <div className="services-grid">
                        {catalogServices.map((service) => {
                          const isActive = cabinetForm.services.includes(service);
                          return (
                            <label key={service} className={`service-card ${isActive ? 'service-card--active' : ''}`}>
                              <input type="checkbox" checked={isActive} onChange={() => toggleCabinetService(service)} />
                              <div className="service-card__content">
                                <span className="service-card__title">{service}</span>
                                <span className="service-card__note">Услуга из каталога</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {cabinetForm.services.length > 0 && (
                        <div className="cabinet-tags">
                          {cabinetForm.services.map((s) => <span key={s} className="cabinet-tag">{s}</span>)}
                        </div>
                      )}
                    </section>

                    {/* Галерея работ */}
                    <section className="editor-card">
                      <div className="editor-card__head">
                        <div><h4>Галерея работ</h4><p>Фото макетов и готовых деталей — до 12 изображений.</p></div>
                        <span className="editor-card__badge">Портфолио</span>
                      </div>
                      <div className="cabinet-works">
                        {cabinetForm.works.length === 0 ? (
                          <label htmlFor="works-upload" className="works-drop-zone"
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--ec-accent)'; e.currentTarget.style.background='var(--ec-accent-soft)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--ec-border)'; e.currentTarget.style.background='#f8fafc'; }}
                            style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'40px 20px', border:'2px dashed var(--ec-border)', borderRadius:'var(--ec-radius-sm)', cursor:'pointer', background:'#f8fafc', transition:'border-color .18s, background .18s' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span style={{ fontFamily:'Inter,sans-serif', fontSize:14, color:'var(--ec-text-secondary)', fontWeight:500 }}>
                              Нажмите, чтобы добавить фото
                            </span>
                            <small className="profile-note">PNG/JPG, до 2 МБ каждое</small>
                          </label>
                        ) : (
                          <div className="cabinet-works-grid">
                            {cabinetForm.works.map((work, index) => (
                              <div key={`${work.name || 'work'}-${index}`} className="cabinet-work">
                                <img src={work.data} alt={work.name || 'Работа'} />
                                <button type="button" className="cabinet-work__remove" onClick={() => removeWork(index)}>
                                  Удалить
                                </button>
                              </div>
                            ))}
                            {cabinetForm.works.length < 12 && (
                              <label htmlFor="works-upload"
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--ec-accent)'; e.currentTarget.style.background='var(--ec-accent-soft)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--ec-border)'; e.currentTarget.style.background='#f8fafc'; }}
                                style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, border:'2px dashed var(--ec-border)', borderRadius:'var(--ec-radius-sm)', cursor:'pointer', background:'#f8fafc', aspectRatio:'1', transition:'border-color .18s, background .18s' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:'var(--ec-text-muted)' }}>Добавить</span>
                              </label>
                            )}
                          </div>
                        )}
                        <input id="works-upload" className="profile-avatar-input" type="file"
                          accept="image/*" multiple onChange={onWorksChange} />
                      </div>
                    </section>

                    <button type="button" className="profile-btn profile-btn--action"
                      onClick={saveExecutorAndCabinet} disabled={isExecutorSaving}>
                      {isExecutorSaving ? 'Сохранение...' : 'Сохранить профиль и кабинет'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ===== ВКЛАДКА: ОБО МНЕ ===== */}
          {activeTab === 'about' && (
            <div className="profile-body">
              <aside className="profile-side">
                <div className="profile-avatar-card">
                  <div className="profile-avatar">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Avatar" />
                    ) : (
                      <span>{(form.name || 'Профиль').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <label className="profile-btn profile-btn--ghost" htmlFor="avatar-upload">
                    Сменить аватар
                  </label>
                  <input
                    id="avatar-upload"
                    className="profile-avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                  />
                  <small className="profile-note">Формат: PNG/JPG, до 1 МБ.</small>
                </div>
              </aside>

              <section className="profile-card profile-card--info">
                <h2>Личные данные</h2>
                <form id="profile-save-form" onSubmit={onSaveProfile} className="profile-table">
                  <div className="profile-row">
                    <span className="profile-row__label">Email:</span>
                    <div className="profile-row__field">
                      <input
                        name="email"
                        type="email"
                        placeholder="например: aidana@mail.kz"
                        value={form.email}
                        onChange={onFormChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row__label">Имя:</span>
                    <div className="profile-row__field">
                      <input
                        name="name"
                        type="text"
                        placeholder="например: Айдана"
                        value={form.name}
                        onChange={onFormChange}
                        required
                      />
                    </div>
                  </div>
                  {message && (
                    <p className={`profile-message ${isError ? 'profile-message--error' : 'profile-message--ok'}`}>
                      {message}
                    </p>
                  )}
                </form>

                <h2>Смена пароля</h2>
                <form onSubmit={onChangePassword} className="profile-table">
                  <div className="profile-row">
                    <span className="profile-row__label">Текущий пароль:</span>
                    <div className="profile-row__field">
                      <input
                        name="currentPassword"
                        type="password"
                        placeholder="Введите текущий пароль"
                        value={passwordForm.currentPassword}
                        onChange={onPasswordChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row__label">Новый пароль:</span>
                    <div className="profile-row__field">
                      <input
                        name="newPassword"
                        type="password"
                        placeholder="Минимум 8 символов"
                        value={passwordForm.newPassword}
                        onChange={onPasswordChange}
                        required
                      />
                    </div>
                  </div>
                  {passwordMessage && (
                    <p className={`profile-message ${isPasswordError ? 'profile-message--error' : 'profile-message--ok'}`}>
                      {passwordMessage}
                    </p>
                  )}
                  <button type="submit" className="profile-btn profile-btn--primary" disabled={isPasswordLoading}>
                    {isPasswordLoading ? 'Сохранение...' : 'Обновить пароль'}
                  </button>
                </form>

                <div className="profile-reviews">
                  <div className="orders-header">
                    <div>
                      <h2>Отзывы обо мне</h2>
                      <p>Отзывы пользователей о вашей работе.</p>
                    </div>
                  </div>
                  {reviewsMessage && <p className="orders-message">{reviewsMessage}</p>}
                  {isReviewsLoading ? (
                    <p className="orders-empty">Загрузка отзывов...</p>
                  ) : profileReviews.length === 0 ? (
                    <p className="orders-empty">Пока нет отзывов.</p>
                  ) : (
                    <div className="reviews-list">
                      {profileReviews.map((review) => (
                        <div key={review.id} className="review-item">
                          <div className="review-item__head">
                            <span className="review-item__name">{review.reviewer_name || 'Пользователь'}</span>
                            <span className="review-item__rating">Оценка: {review.rating}/5</span>
                          </div>
                          <p className="review-item__text">{review.text}</p>
                          <span className="review-item__date">
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ===== ВКЛАДКА: МОИ ЗАКАЗЫ ===== */}
          {activeTab === 'orders' && (
            <section className="profile-card profile-card--orders">
              <div className="orders-header">
                <div>
                  <h2>Мои заказы</h2>
                  <p>История ваших заказов и их текущий статус.</p>
                </div>
                <button
                  type="button"
                  className="orders-create-btn"
                  onClick={() => {
                    if (!user?.id) {
                      window.alert('Для создания заказа зарегистрируйтесь!');
                      return;
                    }
                    setIsOrderModalOpen(true);
                    setOrderErrors({});
                  }}
                >
                  Создать заказ
                </button>
              </div>

              {ordersMessage && <p className="orders-message">{ordersMessage}</p>}

              <div className="orders-list">
                {isOrdersLoading ? (
                  <p className="orders-empty">Загрузка заказов...</p>
                ) : orders.length === 0 ? (
                  <p className="orders-empty">Пока нет заказов. Создайте первый заказ.</p>
                ) : (
                  orders.map((order) => (
                    <article key={order.id} className="orders-item">
                      <div className="orders-item__head">
                        <div>
                          <h3>{order.service}</h3>
                          <p>Срок: {order.deadline}</p>
                          <p>Номер заказа: #{order.id}</p>
                        </div>
                        <span className={`orders-status orders-status--${statusClassMap[order.status] || 'pending'}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="orders-item__details">{order.details}</p>
                      <div className="orders-item__footer">
                        <span>Бюджет: {Number(order.budget).toLocaleString()} тг</span>
                        {order.file_name && <span>Файл: {order.file_name}</span>}
                      </div>

                      {order.status === 'Готов' ? (
                        <div className="orders-item__responses">
                          <div className="orders-item__actions">
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => openPreview(order.file_name, order.file_data)}
                              disabled={!order.file_data}
                              title={order.file_data ? '' : 'Файл не прикреплён'}
                            >
                              Открыть файл
                            </button>
                          </div>
                        </div>
                      ) : order.status === 'Изготовка изделия' ? (
                        <div className="orders-item__responses">
                          <span>Статус: Изготовка изделия</span>
                          <span>
                            Изготовляет:{' '}
                            {order.accepted_executor_user_id ? (
                              <button
                                type="button"
                                className="profile-link-btn"
                                onClick={() => openUserProfile(order.accepted_executor_user_id)}
                              >
                                {getOrderExecutorLabel(order) || 'Исполнитель'}
                              </button>
                            ) : (
                              getOrderExecutorLabel(order) || 'Исполнитель не указан'
                            )}
                          </span>
                          <div className="orders-item__actions">
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => completeOrder(order.id)}
                            >
                              Подтвердить работу
                            </button>
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => openPreview(order.file_name, order.file_data)}
                              disabled={!order.file_data}
                              title={order.file_data ? '' : 'Файл не прикреплён'}
                            >
                              Открыть файл
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="orders-item__responses">
                          <span>Откликнулось {responseCounts[String(order.id)] || 0} исполнителей</span>
                          <div className="orders-item__actions">
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => openResponsesModal(order.id, order.service, order.status)}
                            >
                              Посмотреть отклики
                            </button>
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => openPreview(order.file_name, order.file_data)}
                              disabled={!order.file_data}
                              title={order.file_data ? '' : 'Файл не прикреплён'}
                            >
                              Открыть файл
                            </button>
                            {order.status === 'Ожидает' && (
                              <button
                                type="button"
                                className="orders-view-btn orders-view-btn--danger"
                                onClick={() => deleteOrder(order.id)}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ===== ВКЛАДКА: НАЙТИ ЗАКАЗ ===== */}
          {activeTab === 'market' && executor && (
            <section className="profile-card profile-card--orders">
              <div className="orders-header">
                <div>
                  <h2>Найти заказ</h2>
                  <p>Список всех созданных заказов.</p>
                </div>
              </div>

              {marketMessage && <p className="orders-message">{marketMessage}</p>}

              <div className="orders-list">
                {isMarketLoading ? (
                  <p className="orders-empty">Загрузка заказов...</p>
                ) : marketOrders.length === 0 ? (
                  <p className="orders-empty">Пока нет заказов.</p>
                ) : (
                  marketOrders.map((order) => (
                    <article key={order.id} className="orders-item">
                      <div className="orders-item__head">
                        <div>
                          <h3>{order.service}</h3>
                          <p>Срок: {order.deadline}</p>
                        </div>
                        <span className={`orders-status orders-status--${statusClassMap[order.status] || 'pending'}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="orders-item__details">{order.details}</p>
                      <p className="orders-item__customer">Заказчик: {order.user_name || '?'}</p>
                      <div className="orders-item__footer">
                        <span>Бюджет: {Number(order.budget).toLocaleString()} тг</span>
                        {order.file_name && <span>Файл: {order.file_name}</span>}
                      </div>
                      <div className="orders-item__responses">
                        <div className="orders-item__actions">
                          {order.status !== 'Готов' && (
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() => respondToOrder(order.id, order.user_id, order.user_name, order.status)}
                            >
                              Откликнуться
                            </button>
                          )}
                          <button
                            type="button"
                            className="orders-view-btn"
                            onClick={() => openPreview(order.file_name, order.file_data)}
                            disabled={!order.file_data}
                            title={order.file_data ? '' : 'Файл не прикреплён'}
                          >
                            Открыть файл
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ===== ВКЛАДКА: ЧАТЫ ===== */}
          {activeTab === 'chats' && (
            <section className="profile-card profile-card--orders">
              <div className="orders-header">
                <div>
                  <h2>Чаты</h2>
                  <p>Все диалоги по заказам.</p>
                </div>
                {executor && (
                  <div className="chat-filter">
                    <button
                      type="button"
                      className={`orders-view-btn ${chatMode === 'executor' ? 'orders-view-btn--active' : ''}`}
                      onClick={() => setChatMode('executor')}
                    >
                      Чаты исполнителя
                    </button>
                    <button
                      type="button"
                      className={`orders-view-btn ${chatMode === 'customer' ? 'orders-view-btn--active' : ''}`}
                      onClick={() => setChatMode('customer')}
                    >
                      Чаты заказчика
                    </button>
                  </div>
                )}
              </div>

              {threadsMessage && <p className="orders-message">{threadsMessage}</p>}

              <div className="chat-section">
                <div className="chat-threads">
                  <div className="orders-list">
                    {isThreadsLoading ? (
                      <p className="orders-empty">Загрузка чатов...</p>
                    ) : filteredChatThreads.length === 0 ? (
                      <p className="orders-empty">Пока нет чатов.</p>
                    ) : (
                      filteredChatThreads.map((thread) => {
                        const isActiveThread =
                          activeChat &&
                          Number(activeChat.orderId) === Number(thread.order_id) &&
                          Number(activeChat.peerId) === Number(thread.peer_id);
                        return (
                          <article
                            key={`${thread.order_id}-${thread.peer_id}`}
                            className={`orders-item ${isActiveThread ? 'orders-item--active' : ''}`}
                          >
                            <div className="orders-item__head">
                              <div>
                                <h3>{thread.order_service}</h3>
                                <p>
                                  Собеседник:{' '}
                                  <button
                                    type="button"
                                    className="profile-link-btn"
                                    onClick={() => openUserProfile(thread.peer_id)}
                                  >
                                    {thread.peer_name}
                                  </button>
                                </p>
                              </div>
                              <span className={`orders-status orders-status--${statusClassMap[thread.order_status] || 'pending'}`}>
                                {thread.order_status}
                              </span>
                            </div>
                            <p className="orders-item__details">{thread.last_message}</p>
                            <p className="orders-item__details">Номер заказа: #{thread.order_id}</p>
                            <div className="orders-item__footer">
                              <span>{new Date(thread.last_time).toLocaleString()}</span>
                              {isChatLockedForUser(thread.order_user_id, thread.accepted_executor_user_id) ? (
                                <p className="orders-message">Заказчик выбрал другого исполнителя</p>
                              ) : (
                                <button
                                  type="button"
                                  className={`orders-view-btn ${isActiveThread ? 'orders-view-btn--selected' : ''}`}
                                  onClick={() =>
                                    openChatWithResponder(
                                      thread.order_id,
                                      thread.peer_id,
                                      thread.peer_name,
                                      thread.order_status,
                                      thread.order_user_id,
                                      thread.accepted_executor_user_id,
                                    )
                                  }
                                >
                                  Открыть чат
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="chat-panel">
                  {activeChat ? (
                    <>
                      <div className="chat-panel__header">
                        <div>
                          <h3>
                            Чат:{' '}
                            <button
                              type="button"
                              className="profile-link-btn"
                              onClick={() => openUserProfile(activeChat.peerId)}
                            >
                              {activeChat.peerName}
                            </button>
                          </h3>
                          <p className="orders-item__details">Номер заказа: #{activeChat.orderId}</p>
                        </div>
                      </div>

                      {chatError && <p className="orders-message">{chatError}</p>}
                      {isChatLockedForUser(activeChat.orderUserId, activeChat.acceptedExecutorUserId) && (
                        <p className="orders-message">Заказчик выбрал другого исполнителя</p>
                      )}

                      <div className="chat-layout">
                        <div className="chat-main">
                          <div className="chat-body" ref={chatBodyRef}>
                            {isChatLoading ? (
                              <p className="orders-empty">Загрузка сообщений...</p>
                            ) : chatMessages.length === 0 ? (
                              <p className="orders-empty">Сообщений пока нет.</p>
                            ) : (
                              chatMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`chat-message ${msg.sender_user_id === user.id ? 'chat-message--me' : ''}`}
                                >
                                  {msg.content && <p>{msg.content}</p>}
                                  {msg.file_data && (
                                    msg.file_data.startsWith('data:image') ? (
                                      <button
                                        type="button"
                                        className="chat-image-btn"
                                        onClick={() => openPreview(msg.file_name, msg.file_data)}
                                      >
                                        <img src={msg.file_data} alt={msg.file_name || 'Файл'} />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="chat-file-btn"
                                        onClick={() => openPreview(msg.file_name, msg.file_data)}
                                      >
                                        {msg.file_name || 'Файл'}
                                      </button>
                                    )
                                  )}
                                  <span>{new Date(msg.created_at).toLocaleString()}</span>
                                </div>
                              ))
                            )}
                          </div>
                          {!isChatLockedForUser(activeChat.orderUserId, activeChat.acceptedExecutorUserId) && (
                            <>
                              <div className="chat-input">
                                <label className="chat-attach">
                                  <input
                                    type="file"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        const result = typeof reader.result === 'string' ? reader.result : '';
                                        setChatFileName(file.name);
                                        setChatFileData(result);
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                  Прикрепить
                                </label>
                                <input
                                  type="text"
                                  placeholder="Напишите сообщение..."
                                  value={chatMessage}
                                  onChange={(event) => setChatMessage(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                      event.preventDefault();
                                      sendChatMessage();
                                    }
                                  }}
                                />
                                <button type="button" className="orders-view-btn" onClick={sendChatMessage}>
                                  Отправить
                                </button>
                              </div>
                              {chatFileName && <p className="chat-file-name">Файл: {chatFileName}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="chat-panel__empty">
                      <p className="orders-empty">Выберите чат из списка слева.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'about' && (
            <div className="profile-footer">
              <button type="button" className="profile-btn profile-btn--logout" onClick={handleLogout}>
                Выйти
              </button>
              <button
                type="submit"
                form="profile-save-form"
                className="profile-btn profile-btn--save"
                disabled={isLoading}
              >
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ===== МОДАЛ: ОТКЛИКИ ===== */}
      {responsesModal.open && (
        <div
          className="order-modal"
          onClick={() => setResponsesModal({ open: false, orderId: null, orderTitle: '', orderStatus: '' })}
        >
          <div className="order-modal__card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal__header">
              <h2>Отклики: {responsesModal.orderTitle}</h2>
              <button
                type="button"
                className="order-modal__close"
                onClick={() => setResponsesModal({ open: false, orderId: null, orderTitle: '', orderStatus: '' })}
              >
                ×
              </button>
            </div>

            {responsesMessage && <p className="orders-message">{responsesMessage}</p>}

            {isResponsesLoading ? (
              <p className="orders-empty">Загрузка откликов...</p>
            ) : responsesList.length === 0 ? (
              <p className="orders-empty">Пока нет откликов.</p>
            ) : (
              <div className="responses-list">
                {responsesList.map((responder) => (
                  <div key={responder.id} className="responses-item">
                    <div>
                      <p className="responses-name">
                        {responder.user_name || 'Исполнитель'}{' '}
                        ({responder.executor_type === 'organization' ? 'Организация' : 'Частный'})
                      </p>
                      <p className="responses-meta">
                        {responder.first_name} {responder.last_name} · {responder.phone}
                      </p>
                    </div>
                    <div className="orders-item__actions">
                      <button
                        type="button"
                        className="orders-view-btn"
                        onClick={() =>
                          openChatWithResponder(
                            responsesModal.orderId,
                            responder.executor_user_id,
                            responder.user_name,
                            responsesModal.orderStatus,
                            user?.id,
                            null,
                          )
                        }
                      >
                        Открыть чат
                      </button>
                      <button
                        type="button"
                        className="orders-view-btn"
                        onClick={() => acceptExecutorForOrder(responsesModal.orderId, responder.executor_user_id)}
                      >
                        Принять исполнителя
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== МОДАЛ: ЧАТ (вне вкладки чатов) ===== */}
      {activeChat && activeTab !== 'chats' && (
        <div className="order-modal" onClick={() => setActiveChat(null)}>
          <div className="order-modal__card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal__header">
              <h2>
                Чат:{' '}
                <button
                  type="button"
                  className="profile-link-btn"
                  onClick={() => openUserProfile(activeChat.peerId)}
                >
                  {activeChat.peerName}
                </button>
              </h2>
              <p className="orders-item__details">Номер заказа: #{activeChat.orderId}</p>
              {activeChat.orderStatus && (
                <span className="chat-status">Статус заказа: {activeChat.orderStatus}</span>
              )}
              <button type="button" className="order-modal__close" onClick={() => setActiveChat(null)}>
                ×
              </button>
            </div>

            {chatError && <p className="orders-message">{chatError}</p>}
            {isChatLockedForUser(activeChat.orderUserId, activeChat.acceptedExecutorUserId) && (
              <p className="orders-message">Заказчик выбрал другого исполнителя</p>
            )}

            <div className="chat-layout">
              <div className="chat-main">
                <div className="chat-body" ref={chatBodyModalRef}>
                  {isChatLoading ? (
                    <p className="orders-empty">Загрузка сообщений...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="orders-empty">Сообщений пока нет.</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-message ${msg.sender_user_id === user.id ? 'chat-message--me' : ''}`}
                      >
                        {msg.content && <p>{msg.content}</p>}
                        {msg.file_data && (
                          msg.file_data.startsWith('data:image') ? (
                            <button
                              type="button"
                              className="chat-image-btn"
                              onClick={() => openPreview(msg.file_name, msg.file_data)}
                            >
                              <img src={msg.file_data} alt={msg.file_name || 'Файл'} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="chat-file-btn"
                              onClick={() => openPreview(msg.file_name, msg.file_data)}
                            >
                              {msg.file_name || 'Файл'}
                            </button>
                          )
                        )}
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
                {!isChatLockedForUser(activeChat.orderUserId, activeChat.acceptedExecutorUserId) && (
                  <>
                    <div className="chat-input">
                      <label className="chat-attach">
                        <input
                          type="file"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = typeof reader.result === 'string' ? reader.result : '';
                              setChatFileName(file.name);
                              setChatFileData(result);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        Прикрепить
                      </label>
                      <input
                        type="text"
                        placeholder="Напишите сообщение..."
                        value={chatMessage}
                        onChange={(event) => setChatMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            sendChatMessage();
                          }
                        }}
                      />
                      <button type="button" className="orders-view-btn" onClick={sendChatMessage}>
                        Отправить
                      </button>
                    </div>
                    {chatFileName && <p className="chat-file-name">Файл: {chatFileName}</p>}
                  </>
                )}
              </div>
              <aside className="chat-side">
                <p className="chat-side__title">Статус заказа</p>
                <ul className="chat-status-list">
                  {['Ожидает', 'Изготовка изделия', 'Готов'].map((status) => (
                    <li
                      key={status}
                      className={`chat-status-item ${activeChat.orderStatus === status ? 'chat-status-item--active' : ''}`}
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛ: ПРЕДПРОСМОТР ФАЙЛА ===== */}
      {previewFile.open && (
        <div
          className={`order-modal ${previewFile.data.startsWith('data:image') ? 'order-modal--fullscreen' : ''}`}
          onClick={() => setPreviewFile({ open: false, name: '', data: '' })}
        >
          <div
            className="order-modal__card order-modal__card--preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="order-modal__header">
              <h2>{previewFile.name || 'Файл'}</h2>
              <button
                type="button"
                className="order-modal__close"
                onClick={() => setPreviewFile({ open: false, name: '', data: '' })}
              >
                ×
              </button>
            </div>
            <div className="file-preview">
              {previewFile.data.startsWith('data:image') ? (
                <img src={previewFile.data} alt={previewFile.name || 'Файл'} />
              ) : previewFile.data.startsWith('data:application/pdf') ? (
                <iframe title="preview" src={previewFile.data} />
              ) : (
                <div className="file-preview__download">
                  <p>Просмотр доступен только для изображений и PDF.</p>
                  <a href={previewFile.data} download={previewFile.name || 'file'}>
                    Скачать файл
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛ: НОВЫЙ ЗАКАЗ ===== */}
      {isOrderModalOpen && (
        <div className="order-modal" onClick={() => setIsOrderModalOpen(false)}>
          <div className="order-modal__card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal__header">
              <h2>Новый заказ</h2>
              <button
                type="button"
                className="order-modal__close"
                onClick={() => setIsOrderModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="order-form" onSubmit={handleOrderSubmit} noValidate>
              <label className="order-form__field">
                <span>Выберите услугу из каталога</span>
                <select
                  value={orderForm.service}
                  onChange={(event) => handleOrderFieldChange('service', event.target.value)}
                  required
                >
                  <option value="" disabled>Выберите услугу</option>
                  <option value="Прототипирование изделий">Прототипирование изделий</option>
                  <option value="3D-моделирование с нуля">3D-моделирование с нуля</option>
                  <option value="Мелкосерийное производство">Мелкосерийное производство</option>
                  <option value="Функциональные детали">Функциональные детали</option>
                  <option value="Печать высокоточных моделей">Печать высокоточных моделей</option>
                  <option value="Крупногабаритная печать">Крупногабаритная печать</option>
                </select>
                {orderErrors.service && <p className="order-form__error">{orderErrors.service}</p>}
              </label>

              <label className="order-form__field">
                <span>Рассказать о модели и подробностях, которые стоит знать</span>
                <textarea
                  rows="4"
                  placeholder="Опишите материал, размеры, цвет, требования к качеству и т.д."
                  value={orderForm.details}
                  onChange={(event) => handleOrderFieldChange('details', event.target.value)}
                  required
                />
                {orderErrors.details && <p className="order-form__error">{orderErrors.details}</p>}
              </label>

              <div className="order-form__field">
                <span>Прикрепить файл</span>
                <div className="order-file">
                  <input
                    id="order-file-profile"
                    type="file"
                    className="order-file__input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      const fileName = file?.name;
                      setSelectedFileName(fileName || 'Файл не выбран (необязательно)');
                      if (!file) {
                        setSelectedFileData('');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : '';
                        setSelectedFileData(result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label htmlFor="order-file-profile" className="order-file__button">
                    Выберите файл
                  </label>
                  <p className="order-file__name">{selectedFileName}</p>
                </div>
              </div>

              <div className="order-form__row">
                <label className="order-form__field">
                  <span>Бюджет (тенге)</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    list="budget-options-profile"
                    placeholder="Например: 50000"
                    value={orderForm.budget}
                    onChange={(event) => handleOrderFieldChange('budget', event.target.value)}
                    required
                  />
                  {orderErrors.budget && <p className="order-form__error">{orderErrors.budget}</p>}
                  <datalist id="budget-options-profile">
                    <option value="20000" />
                    <option value="50000" />
                    <option value="100000" />
                    <option value="200000" />
                    <option value="500000" />
                  </datalist>
                </label>

                <label className="order-form__field">
                  <span>Срок выполнения</span>
                  <input
                    type="date"
                    className="order-date-input"
                    value={orderForm.deadline}
                    onChange={(event) => handleOrderFieldChange('deadline', event.target.value)}
                    required
                  />
                  {orderErrors.deadline && <p className="order-form__error">{orderErrors.deadline}</p>}
                </label>
              </div>

              <button type="submit" className="order-form__submit">
                Опубликовать заказ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;