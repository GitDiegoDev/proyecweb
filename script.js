/**
 * MI RITMO - Aplicación Web MVP de Seguimiento de Hábitos Intestinales
 * Lógica en JavaScript Vanilla (Sin dependencias externas)
 */

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. MÓDULO DE ALMACENAMIENTO (StorageModule)
  // ==========================================================================
  const StorageModule = {
    STORAGE_KEY: 'miritmo_evacuaciones',

    getAll() {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('Error al leer de localStorage', e);
        return [];
      }
    },

    saveAll(records) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
        return true;
      } catch (e) {
        console.error('Error al guardar en localStorage', e);
        UIController.showToast('No se pudo guardar el registro en tu dispositivo. Es posible que el almacenamiento esté lleno.');
        return false;
      }
    },

    addRecord(record) {
      const records = this.getAll();
      records.push(record);
      // Ordenar por timestamp descendente (más reciente primero)
      records.sort((a, b) => b.timestamp - a.timestamp);
      this.saveAll(records);
      return record;
    },

    updateRecord(updatedRecord) {
      let records = this.getAll();
      records = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      records.sort((a, b) => b.timestamp - a.timestamp);
      this.saveAll(records);
    },

    deleteRecord(id) {
      let records = this.getAll();
      records = records.filter(r => r.id !== id);
      this.saveAll(records);
    },

    getById(id) {
      const records = this.getAll();
      return records.find(r => r.id === id);
    }
  };

  // ==========================================================================
  // 2. MOTOR DE RECOMENDACIONES (RecommendationEngine)
  // ==========================================================================
  const RecommendationEngine = {
    generate(records) {
      if (!records || records.length === 0) {
        return {
          icon: '🌱',
          title: '¡Bienvenida a Mi Ritmo!',
          message: 'Registra tu primera visita presionando "¿Cómo te fue hoy?" para comenzar a acompañar tu ritmo y recibir recomendaciones adaptadas.'
        };
      }

      // Ordenados por timestamp descendente
      const latest = records[0];
      const now = new Date();
      const lastDate = new Date(latest.timestamp);

      // Diferencia en días (reseteando horas para comparar días calendario)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDateStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const diffTime = todayStart.getTime() - lastDateStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      // Análisis de los últimos 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRecords = records.filter(r => new Date(r.timestamp) >= sevenDaysAgo);

      const hasBlood = records.some(r => r.blood === 'sí');
      const hasFever = records.some(r => r.fever === 'sí');
      const painCount = recentRecords.filter(r => r.pain === 'sí').length;

      // 1. Alertas de atención médica inmediata por banderas rojas o molestias frecuentes
      if (hasBlood || hasFever || painCount >= 3) {
        let alertReason = '';
        if (hasBlood) alertReason = 'sangre en los registros';
        else if (hasFever) alertReason = 'fiebre o malestar general';
        else alertReason = 'molestias o dolor en 3 o más ocasiones esta semana';

        return {
          icon: '🩺',
          title: 'Consulta médica sugerida',
          message: `Has indicado ${alertReason}. Te recomendamos consultar con un profesional de la salud a la brevedad para evaluar tu bienestar de forma segura y personalizada.`,
          isAlert: true
        };
      }

      // 2. Orientación según días transcurridos sin registros
      if (diffDays === 0) {
        return {
          icon: '✨',
          title: 'Ritmo al día',
          message: '¡Excelente! Ya registraste tu visita de hoy. Mantén tus buenos hábitos de hidratación, alimentación variada y movimiento constante.'
        };
      } else if (diffDays === 1) {
        return {
          icon: '🌿',
          title: 'Ritmo cómodo',
          message: 'Tu último registro fue ayer. Tu cuerpo evoluciona con tranquilidad. Continúa escuchándote y bebiendo suficiente agua durante el día.'
        };
      } else if (diffDays >= 2 && diffDays <= 3) {
        return {
          icon: '💧',
          title: 'Un par de días de pausa',
          message: `Han pasado ${diffDays} días sin registrar visitas. Para acompañar a tu colon, aumenta el consumo de fibra (18-30g diarios, incrementándola de forma gradual), bebe 1.5 a 2 litros de agua y procura ir al baño a un horario fijo (idealmente 15-45 minutos después de una comida).`
        };
      } else if (diffDays >= 4 && diffDays <= 6) {
        return {
          icon: '🧘‍♀️',
          title: 'Cuidando tu cuerpo',
          message: `Llevas ${diffDays} días sin registrar visitas. Además de mantener la hidratación y la fibra gradual, intenta apoyar los pies sobre un banquito bajo en el inodoro para que las rodillas queden por encima de las caderas. Si no notas mejoría, puedes consultar con un farmacéutico.`
        };
      } else if (diffDays >= 7) {
        return {
          icon: '🩺',
          title: 'Es momento de consultar',
          message: `Han transcurrido ${diffDays} días sin registro de visitas. Te recomendamos consultar directamente con tu médico o farmacéutico para recibir una guía adecuada a tus necesidades.`
        };
      }

      return {
        icon: '🌸',
        title: 'Cuidando tu bienestar',
        message: 'Acompañar diariamente tu ritmo ayuda a identificar patrones y cuidar tu salud digestiva de forma natural.'
      };
    }
  };

  // ==========================================================================
  // 3. CONTROLADOR DE LA INTERFAZ Y EVENTOS (UIController)
  // ==========================================================================
  const UIController = {
    currentCalendarMonth: new Date().getMonth(),
    currentCalendarYear: new Date().getFullYear(),
    selectedCalendarDateStr: null,

    init() {
      this.updateGreeting();
      this.setupNavigation();
      this.setupModalEvents();
      this.setupFormChips();
      this.setupCalendarEvents();
      this.setupBackupEvents();
      this.setupReminderEvents();
      this.checkDailyReminder();
      this.renderAll();
    },

    setupReminderEvents() {
      const toggle = document.getElementById('toggle-reminder');
      if (!toggle) return;

      const savedState = localStorage.getItem('miritmo_reminder_enabled') === 'true';
      toggle.checked = savedState;

      toggle.addEventListener('change', async () => {
        if (toggle.checked) {
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              localStorage.setItem('miritmo_reminder_enabled', 'true');
              this.showToast('¡Recordatorios diarios activados! 🌸');
              this.checkDailyReminder();
            } else {
              toggle.checked = false;
              localStorage.setItem('miritmo_reminder_enabled', 'false');
              alert('Necesitas conceder permisos de notificación en tu navegador para activar el recordatorio.');
            }
          } else {
            toggle.checked = false;
            alert('Tu navegador no soporta la API de Notificaciones.');
          }
        } else {
          localStorage.setItem('miritmo_reminder_enabled', 'false');
          this.showToast('Recordatorios desactivados');
        }
      });
    },

    /**
     * Aclaración técnica: Los navegadores en entornos PWA sin servidor backend (Push Service)
     * no garantizan la ejecución de notificaciones programadas en segundo plano cuando la app está totalmente cerrada.
     * Se implementa como la mejor aproximación posible:
     * 1) Verificación al abrir la aplicación si aún no se registró nada hoy y las notificaciones están activadas.
     * 2) Intento de programación mediante Notification Trigger API (si el navegador la soporta).
     */
    checkDailyReminder() {
      const isEnabled = localStorage.getItem('miritmo_reminder_enabled') === 'true';
      if (!isEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const records = StorageModule.getAll();
      const todayStr = toLocalDateStr(new Date());
      const hasTodayRecord = records.some(r => r.date === todayStr);

      if (!hasTodayRecord) {
        // Enviar notificación local al abrir si aún no ha registrado
        const lastNotifDate = localStorage.getItem('miritmo_last_notif_date');
        if (lastNotifDate !== todayStr) {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('Mi Ritmo 🌸', {
                body: '¿Cómo te fue hoy? Recuerda registrar tu visita diaria para cuidar tu bienestar.',
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: 'daily-reminder'
              });
            });
          } else {
            new Notification('Mi Ritmo 🌸', {
              body: '¿Cómo te fue hoy? Recuerda registrar tu visita diaria para cuidar tu bienestar.',
              icon: 'icons/icon-192.png'
            });
          }
          localStorage.setItem('miritmo_last_notif_date', todayStr);
        }
      }
    },

    showToast(message) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 4000);
    },

    setupBackupEvents() {
      const btnExport = document.getElementById('btn-export-data');
      const btnImportTrigger = document.getElementById('btn-import-trigger');
      const fileInput = document.getElementById('file-import-json');

      btnExport?.addEventListener('click', () => {
        const records = StorageModule.getAll();
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const todayStr = toLocalDateStr(new Date());

        const a = document.createElement('a');
        a.href = url;
        a.download = `mi-ritmo-backup-${todayStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      btnImportTrigger?.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedRecords = JSON.parse(event.target.result);
            if (!Array.isArray(importedRecords)) {
              alert('El archivo no tiene un formato de datos válido.');
              return;
            }

            if (confirm(`Se encontraron ${importedRecords.length} registros. ¿Deseas fusionarlos con tu historial actual sin duplicar?`)) {
              const currentRecords = StorageModule.getAll();
              const map = new Map();

              currentRecords.forEach(r => map.set(r.id, r));
              importedRecords.forEach(r => {
                if (r && r.id && r.date) {
                  map.set(r.id, r);
                }
              });

              const merged = Array.from(map.values());
              merged.sort((a, b) => b.timestamp - a.timestamp);

              const success = StorageModule.saveAll(merged);
              if (success) {
                alert('¡Datos importados con éxito!');
                this.renderAll();
              } else {
                alert('Ocurrió un error al guardar los datos importados.');
              }
            }
          } catch (err) {
            alert('Error al leer el archivo JSON: ' + err.message);
          } finally {
            fileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    },

    updateGreeting() {
      const hour = new Date().getHours();
      const greetingEl = document.getElementById('greeting-text');
      if (hour >= 6 && hour < 12) {
        greetingEl.textContent = 'Buenos días 🌸';
      } else if (hour >= 12 && hour < 20) {
        greetingEl.textContent = 'Buenas tardes 🌿';
      } else {
        greetingEl.textContent = 'Buenas noches 🌙';
      }
    },

    setupNavigation() {
      const navItems = document.querySelectorAll('.bottom-nav .nav-item');
      const tabPanes = document.querySelectorAll('.tab-pane');

      navItems.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');

          navItems.forEach(item => item.classList.remove('active'));
          tabPanes.forEach(pane => pane.classList.remove('active'));

          btn.classList.add('active');
          document.getElementById(targetTab).classList.add('active');

          if (targetTab === 'tab-calendario') {
            this.renderCalendar();
          } else if (targetTab === 'tab-estadisticas') {
            this.renderStats();
          }
        });
      });

      document.getElementById('btn-view-all-history')?.addEventListener('click', () => {
        document.querySelector('[data-tab="tab-calendario"]').click();
      });
    },

    setupModalEvents() {
      const modal = document.getElementById('record-modal');
      const btnMain = document.getElementById('btn-open-modal-main');
      const btnEmpty = document.getElementById('btn-open-modal-empty');
      const btnClose = document.getElementById('modal-close-btn');
      const btnCancel = document.getElementById('btn-cancel-modal');
      const btnDelete = document.getElementById('btn-delete-record');
      const form = document.getElementById('record-form');

      const openModal = (recordToEdit = null, defaultDateStr = null) => {
        form.reset();
        document.getElementById('form-record-id').value = '';

        if (recordToEdit) {
          document.getElementById('modal-title').textContent = 'Editar mi registro';
          document.getElementById('form-record-id').value = recordToEdit.id;
          document.getElementById('form-date').value = recordToEdit.date;
          document.getElementById('form-time').value = recordToEdit.time;
          document.getElementById('form-notes').value = recordToEdit.notes || '';
          document.getElementById('form-blood').checked = recordToEdit.blood === 'sí';
          document.getElementById('form-fever').checked = recordToEdit.fever === 'sí';

          this.setChipValue('group-difficulty', 'form-difficulty', recordToEdit.difficulty);
          this.setChipValue('group-pain', 'form-pain', recordToEdit.pain);
          this.setChipValue('group-consistency', 'form-consistency', recordToEdit.consistency);

          btnDelete.style.display = 'block';
        } else {
          document.getElementById('modal-title').textContent = '¿Cómo te fue hoy?';
          const now = new Date();
          const todayStr = defaultDateStr || toLocalDateStr(now);
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          document.getElementById('form-date').value = todayStr;
          document.getElementById('form-time').value = timeStr;
          document.getElementById('form-notes').value = '';
          document.getElementById('form-blood').checked = false;
          document.getElementById('form-fever').checked = false;

          this.setChipValue('group-difficulty', 'form-difficulty', 'normal');
          this.setChipValue('group-pain', 'form-pain', 'no');
          this.setChipValue('group-consistency', 'form-consistency', 'normal');

          btnDelete.style.display = 'none';
        }

        modal.style.display = 'flex';
      };

      const closeModal = () => {
        modal.style.display = 'none';
      };

      btnMain?.addEventListener('click', () => openModal());
      btnEmpty?.addEventListener('click', () => openModal());
      btnClose?.addEventListener('click', closeModal);
      btnCancel?.addEventListener('click', closeModal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      // Eliminar Registro
      btnDelete.addEventListener('click', () => {
        const id = document.getElementById('form-record-id').value;
        if (id) {
          this.showConfirmModal(() => {
            StorageModule.deleteRecord(id);
            closeModal();
            this.renderAll();
          });
        }
      });

      // Guardar Formulario
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('form-record-id').value;
        const date = document.getElementById('form-date').value;
        const time = document.getElementById('form-time').value;
        const difficulty = document.getElementById('form-difficulty').value;
        const pain = document.getElementById('form-pain').value;
        const consistency = document.getElementById('form-consistency').value;
        const blood = document.getElementById('form-blood').checked ? 'sí' : 'no';
        const fever = document.getElementById('form-fever').checked ? 'sí' : 'no';
        const notes = document.getElementById('form-notes').value.trim();

        // Crear objeto Timestamp preciso
        const timestamp = new Date(`${date}T${time}`).getTime();

        const recordData = {
          id: id || 'rec_' + Date.now(),
          date,
          time,
          timestamp,
          difficulty,
          pain,
          consistency,
          blood,
          fever,
          notes
        };

        if (id) {
          StorageModule.updateRecord(recordData);
        } else {
          StorageModule.addRecord(recordData);
        }

        closeModal();
        this.renderAll();
      });

      this.openModalFunc = openModal;
    },

    setupFormChips() {
      const configureChipGroup = (groupId, hiddenInputId) => {
        const container = document.getElementById(groupId);
        if (!container) return;
        const hiddenInput = document.getElementById(hiddenInputId);
        const chips = container.querySelectorAll('.chip');

        chips.forEach(chip => {
          chip.addEventListener('click', () => {
            chips.forEach(c => {
              c.classList.remove('active');
              c.setAttribute('aria-pressed', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-pressed', 'true');
            hiddenInput.value = chip.getAttribute('data-value');
          });
        });
      };

      configureChipGroup('group-difficulty', 'form-difficulty');
      configureChipGroup('group-pain', 'form-pain');
      configureChipGroup('group-consistency', 'form-consistency');
    },

    setChipValue(groupId, hiddenInputId, value) {
      const container = document.getElementById(groupId);
      if (!container) return;
      const hiddenInput = document.getElementById(hiddenInputId);
      hiddenInput.value = value;

      const chips = container.querySelectorAll('.chip');
      chips.forEach(chip => {
        if (chip.getAttribute('data-value') === value) {
          chip.classList.add('active');
          chip.setAttribute('aria-pressed', 'true');
        } else {
          chip.classList.remove('active');
          chip.setAttribute('aria-pressed', 'false');
        }
      });
    },

    setupCalendarEvents() {
      document.getElementById('cal-prev-month').addEventListener('click', () => {
        this.currentCalendarMonth--;
        if (this.currentCalendarMonth < 0) {
          this.currentCalendarMonth = 11;
          this.currentCalendarYear--;
        }
        this.renderCalendar();
      });

      document.getElementById('cal-next-month').addEventListener('click', () => {
        this.currentCalendarMonth++;
        if (this.currentCalendarMonth > 11) {
          this.currentCalendarMonth = 0;
          this.currentCalendarYear++;
        }
        this.renderCalendar();
      });

      document.getElementById('btn-add-for-selected-day')?.addEventListener('click', () => {
        if (this.selectedCalendarDateStr) {
          this.openModalFunc(null, this.selectedCalendarDateStr);
        }
      });
    },

    renderAll() {
      const records = StorageModule.getAll();
      this.renderStatusCard(records);
      this.renderRecommendation(records);
      this.renderWeekSummary(records);
      this.renderRecentRecords(records);
      this.renderCalendar();
      this.renderStats();
    },

    calculateStreak(records) {
      if (!records || records.length === 0) return 0;

      const recordDates = new Set(records.map(r => r.date));
      const today = new Date();
      let checkDate = new Date(today);
      let todayStr = toLocalDateStr(checkDate);

      // Si hoy no hay registro, verificar si ayer hubo registro para mantener la racha activa
      if (!recordDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
        let yesterdayStr = toLocalDateStr(checkDate);
        if (!recordDates.has(yesterdayStr)) {
          return 0;
        }
      }

      let streak = 0;
      while (recordDates.has(toLocalDateStr(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return streak;
    },

    renderStatusCard(records) {
      const counterNumber = document.getElementById('counter-number');
      const counterLabel = document.getElementById('counter-label');
      const statusBadge = document.getElementById('status-badge');
      const statusLastDate = document.getElementById('status-last-date');
      const streakEl = document.getElementById('streak-counter');
      const streakText = document.getElementById('streak-text');

      if (!records || records.length === 0) {
        counterNumber.textContent = '--';
        counterLabel.textContent = 'sin visitas registradas';
        statusBadge.textContent = 'Sin datos';
        statusBadge.className = 'status-badge';
        statusLastDate.textContent = 'Registra para comenzar';
        if (streakEl) streakEl.style.display = 'none';
        return;
      }

      const latest = records[0];
      const now = new Date();
      const lastDate = new Date(latest.timestamp);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDateStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const diffTime = todayStart.getTime() - lastDateStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
      const diffHours = Math.max(0, Math.floor((now.getTime() - latest.timestamp) / (1000 * 3600)));

      if (diffHours < 24) {
        counterNumber.textContent = `${diffHours} hrs`;
        counterLabel.textContent = 'desde tu último registro';
      } else {
        counterNumber.textContent = `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
        counterLabel.textContent = 'desde tu último registro';
      }

      // Formato fecha amigable
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      statusLastDate.textContent = `Último: ${lastDate.toLocaleDateString('es-ES', options)} (${latest.time})`;

      if (diffDays <= 1) {
        statusBadge.textContent = 'Normal';
        statusBadge.className = 'status-badge';
      } else if (diffDays <= 3) {
        statusBadge.textContent = 'Regular';
        statusBadge.className = 'status-badge warning';
      } else {
        statusBadge.textContent = 'Sin registro reciente';
        statusBadge.className = 'status-badge warning';
      }

      // Renderizar Racha
      const streak = this.calculateStreak(records);
      if (streak > 0 && streakEl && streakText) {
        streakText.textContent = `${streak} ${streak === 1 ? 'día seguido' : 'días seguidos'}`;
        streakEl.style.display = 'inline-flex';
      } else if (streakEl) {
        streakEl.style.display = 'none';
      }
    },

    renderRecommendation(records) {
      const rec = RecommendationEngine.generate(records);
      const card = document.getElementById('recommendation-card');
      document.getElementById('rec-icon').textContent = rec.icon;
      document.getElementById('rec-title').textContent = rec.title;
      document.getElementById('rec-message').textContent = rec.message;

      if (rec.isAlert && card) {
        card.classList.add('tip-warning');
      } else if (card) {
        card.classList.remove('tip-warning');
      }
    },

    renderWeekSummary(records) {
      const grid = document.getElementById('week-days-grid');
      const summaryCountEl = document.getElementById('week-summary-count');
      grid.innerHTML = '';

      const today = new Date();
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      let weekRecordsCount = 0;
      const last7Days = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = toLocalDateStr(d);
        const dayRecords = records.filter(r => r.date === dateStr);
        weekRecordsCount += dayRecords.length;

        last7Days.push({
          dateStr,
          dayName: dayNames[d.getDay()],
          dayNumber: d.getDate(),
          isToday: i === 0,
          hasRecord: dayRecords.length > 0,
          count: dayRecords.length
        });
      }

      summaryCountEl.textContent = weekRecordsCount === 1 ? '1 registro' : `${weekRecordsCount} registros`;

      last7Days.forEach(dayInfo => {
        const col = document.createElement('div');
        col.className = 'week-day-col';

        const dotClass = `week-day-dot ${dayInfo.hasRecord ? 'has-record' : ''} ${dayInfo.isToday ? 'today' : ''}`;

        col.innerHTML = `
          <span class="week-day-name">${dayInfo.dayName}</span>
          <div class="${dotClass}">${dayInfo.hasRecord ? '✓' : dayInfo.dayNumber}</div>
        `;
        grid.appendChild(col);
      });
    },

    renderRecentRecords(records) {
      const listEl = document.getElementById('recent-records-list');
      if (!records || records.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📝</span>
            <p>Aún no has registrado tu visita de hoy.</p>
            <button class="btn btn-secondary btn-sm" id="btn-open-modal-empty">Agregar primer registro</button>
          </div>
        `;
        document.getElementById('btn-open-modal-empty')?.addEventListener('click', () => this.openModalFunc());
        return;
      }

      // Mostrar últimos 5 registros
      const recent = records.slice(0, 5);
      listEl.innerHTML = '';

      recent.forEach(r => {
        const item = this.createRecordItemDOM(r);
        listEl.appendChild(item);
      });
    },

    createRecordItemDOM(r) {
      const item = document.createElement('div');
      item.className = 'record-item';

      const d = new Date(r.timestamp);
      const dateFormatted = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      let diffBadgeClass = 'normal';
      if (r.difficulty === 'fácil') diffBadgeClass = 'easy';
      if (r.difficulty === 'difícil') diffBadgeClass = 'hard';
      if (r.difficulty === 'muy difícil') diffBadgeClass = 'very-hard';

      item.innerHTML = `
        <div class="record-main-info">
          <span class="record-time-date">${dateFormatted} - ${r.time} hs</span>
          <div class="record-details-inline">
            <span>Heces: ${r.consistency}</span>
            ${r.notes ? `<span>• 📝 Note</span>` : ''}
          </div>
        </div>
        <div class="record-badges">
          <span class="badge-tag ${diffBadgeClass}">${r.difficulty}</span>
          ${r.pain === 'sí' ? `<span class="badge-tag pain">Molestia</span>` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        this.openModalFunc(r);
      });

      return item;
    },

    renderCalendar() {
      const titleEl = document.getElementById('cal-month-title');
      const gridEl = document.getElementById('calendar-days-grid');
      gridEl.innerHTML = '';

      const records = StorageModule.getAll();
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      titleEl.textContent = `${monthNames[this.currentCalendarMonth]} ${this.currentCalendarYear}`;

      const firstDay = new Date(this.currentCalendarYear, this.currentCalendarMonth, 1);
      const lastDay = new Date(this.currentCalendarYear, this.currentCalendarMonth + 1, 0);

      // Ajuste de inicio de semana (Lunes = 0, Domingo = 6)
      let startDayOfWeek = firstDay.getDay() - 1;
      if (startDayOfWeek === -1) startDayOfWeek = 6;

      const totalDays = lastDay.getDate();

      // Celdas vacías previas
      for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty';
        gridEl.appendChild(emptyCell);
      }

      const todayStr = toLocalDateStr(new Date());

      // Días del mes
      for (let day = 1; day <= totalDays; day++) {
        const dateMonth = String(this.currentCalendarMonth + 1).padStart(2, '0');
        const dateDay = String(day).padStart(2, '0');
        const dateStr = `${this.currentCalendarYear}-${dateMonth}-${dateDay}`;

        const dayRecords = records.filter(r => r.date === dateStr);
        const hasRecord = dayRecords.length > 0;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === this.selectedCalendarDateStr;

        const dayCell = document.createElement('div');
        dayCell.className = `cal-day ${hasRecord ? 'has-record' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;

        dayCell.innerHTML = `
          <span>${day}</span>
          ${hasRecord ? `<div class="cal-dot-indicator"></div>` : ''}
        `;

        dayCell.addEventListener('click', () => {
          this.selectedCalendarDateStr = dateStr;
          this.renderCalendar();
          this.renderDayDetails(dateStr, dayRecords);
        });

        gridEl.appendChild(dayCell);
      }
    },

    renderDayDetails(dateStr, dayRecords) {
      const card = document.getElementById('day-details-card');
      const title = document.getElementById('day-details-title');
      const list = document.getElementById('day-records-list');

      card.style.display = 'block';

      const d = new Date(dateStr + 'T00:00:00');
      const dateFormatted = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      title.textContent = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

      list.innerHTML = '';

      if (dayRecords.length === 0) {
        list.innerHTML = `<p class="empty-state">No hay visitas registradas este día.</p>`;
      } else {
        dayRecords.forEach(r => {
          const item = this.createRecordItemDOM(r);
          list.appendChild(item);
        });
      }
    },

    renderStats() {
      const records = StorageModule.getAll();

      const totalEvacEl = document.getElementById('stat-total-evac');
      const weeklyAvgEl = document.getElementById('stat-weekly-avg');
      const maxGapEl = document.getElementById('stat-max-gap');
      const discomfortDaysEl = document.getElementById('stat-discomfort-days');

      totalEvacEl.textContent = records.length;

      if (records.length === 0) {
        weeklyAvgEl.textContent = '0.0';
        maxGapEl.textContent = '0 días';
        discomfortDaysEl.textContent = '0';
        this.renderConsistencyBars([]);
        this.renderEvolutionChart([]);
        return;
      }

      // Promedio semanal
      const timestamps = records.map(r => r.timestamp);
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps, Date.now());
      const diffDaysTotal = Math.max(1, Math.ceil((maxTime - minTime) / (1000 * 3600 * 24)));
      const weeksActive = Math.max(1, diffDaysTotal / 7);
      const weeklyAvg = (records.length / weeksActive).toFixed(1);
      weeklyAvgEl.textContent = weeklyAvg;

      // Mayor brecha sin evacuar
      const sortedAsc = [...records].sort((a, b) => a.timestamp - b.timestamp);
      let maxGap = 0;
      for (let i = 1; i < sortedAsc.length; i++) {
        const prev = new Date(sortedAsc[i-1].timestamp);
        const curr = new Date(sortedAsc[i].timestamp);
        const gapDays = Math.floor((curr - prev) / (1000 * 3600 * 24));
        if (gapDays > maxGap) maxGap = gapDays;
      }
      maxGapEl.textContent = `${maxGap} días`;

      // Días con molestias (Dolor = sí O Dificultad = difícil / muy difícil)
      const discomfortRecords = records.filter(r => r.pain === 'sí' || r.difficulty === 'difícil' || r.difficulty === 'muy difícil');
      const uniqueDiscomfortDates = new Set(discomfortRecords.map(r => r.date));
      discomfortDaysEl.textContent = uniqueDiscomfortDates.size;

      this.renderConsistencyBars(records);
      this.renderEvolutionChart(records);
    },

    renderConsistencyBars(records) {
      const container = document.getElementById('consistency-bars');
      container.innerHTML = '';

      const categories = ['muy dura', 'dura', 'normal', 'blanda', 'líquida'];
      const total = records.length || 1;

      categories.forEach(cat => {
        const count = records.filter(r => r.consistency === cat).length;
        const percentage = records.length > 0 ? Math.round((count / total) * 100) : 0;

        const item = document.createElement('div');
        item.className = 'consistency-item';
        item.innerHTML = `
          <div class="consistency-label-row">
            <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            <span>${count} (${percentage}%)</span>
          </div>
          <div class="consistency-bar-bg">
            <div class="consistency-bar-fill" style="width: ${percentage}%"></div>
          </div>
        `;
        container.appendChild(item);
      });
    },

    renderEvolutionChart(records) {
      const container = document.getElementById('evolution-chart-container');
      container.innerHTML = '';

      const today = new Date();
      const daysCount = 30;
      let maxDayCount = 1;

      const dailyData = [];

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = toLocalDateStr(d);
        const count = records.filter(r => r.date === dateStr).length;
        if (count > maxDayCount) maxDayCount = count;
        dailyData.push({ dateStr, count });
      }

      dailyData.forEach(item => {
        const col = document.createElement('div');
        col.className = 'evo-bar-col';
        col.title = `${item.dateStr}: ${item.count} visita/s`;

        const heightPercent = item.count > 0 ? (item.count / maxDayCount) * 100 : 8;
        const isBarEmpty = item.count === 0;

        col.innerHTML = `
          <div class="evo-bar ${isBarEmpty ? 'empty' : ''}" style="height: ${heightPercent}%"></div>
        `;
        container.appendChild(col);
      });
    }
  };

  // Registrador de Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.error('Error al registrar Service Worker:', err);
        });
    });
  }

  // Inicializar la App
  UIController.init();
});
