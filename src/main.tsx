import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  GraduationCap, Plus, Users, UserRound, Shuffle, Layers,
  Volume2, VolumeX, Maximize, Play, History, RotateCcw,
  Check, Download, Upload, X, Pencil, Trash2, Copy, Sparkles,
  ArrowRight, Search, CheckCircle2, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import {
  type Data, type Classroom, type Group, uid, emptySession,
  load, save, parseBackup, parseStudents, eligible, pick, divide, signature, formatGroups
} from './core';
import { Mascot, concepts, type Concept } from './Scene';
import { FIXED_CLASS_ID, withFixedClass } from './fixedClass';
import { createClass } from './classes';
import { ANIMATION_MS } from './choreography';
import { GameAudio } from './audio';
import { Stage3D } from './Stage3D';
import './style.css';

const modes = [
  { name: 'Chọn một người', icon: UserRound, desc: 'Gọi 1 bạn lên bảng' },
  { name: 'Chọn nhiều người', icon: Users, desc: 'Gọi nhiều bạn cùng lúc' },
  { name: 'Chia nhóm', icon: Shuffle, desc: 'Chia ngẫu nhiên cả lớp' },
  { name: 'Bốc thăm nhóm', icon: Layers, desc: 'Chọn 1 nhóm thuyết trình' },
];

function initial() {
  try {
    return load(localStorage);
  } catch {
    return {
      data: withFixedClass({ version: 1, active: '', classes: [] }),
      error: 'Trình duyệt không cho phép lưu dữ liệu.',
    };
  }
}

const boot = initial();

function App() {
  const [data, setData] = useState<Data>(boot.data);
  const [storageError, setStorageError] = useState(boot.error);
  const [allowSave, setAllowSave] = useState(!boot.error);
  const [concept, setConcept] = useState<Concept>('ufo');
  const [mode, setMode] = useState(0);
  const [noRepeat, setNoRepeat] = useState(true);
  const [noGroupRepeat, setNoGroupRepeat] = useState(true);
  const [count, setCount] = useState('3');
  const [groupValue, setGroupValue] = useState('3');
  const [bySize, setBySize] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(false);
  const [modal, setModal] = useState<'roster' | 'history' | 'backup' | 'create' | null>(null);
  const [newName, setNewName] = useState('');
  const [newList, setNewList] = useState('');
  const [createError, setCreateError] = useState('');
  const [bulk, setBulk] = useState('');
  const [manualGroups, setManualGroups] = useState('');
  const [preview, setPreview] = useState<Data | null>(null);
  const [replace, setReplace] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<GameAudio | null>(null);
  const runStarted = useRef(0);
  const soundOn = useRef(false);

  const current = data.classes.find((c) => c.id === data.active);
  const session = current?.session;
  const present = current ? eligible(current, false) : [];
  const pool = current ? eligible(current, noRepeat) : [];
  const resultIsGroups = session?.history[0]?.kind === 'Chia nhóm';
  const stale =
    !!current &&
    !!session?.groups.some((g) => g.members.length) &&
    session.signature !== signature(current);

  // Keyboard accessibility for modals
  useEffect(() => {
    if (!modal) return;
    const before = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null);
        return;
      }
      if (e.key === 'Tab') {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.modal button:not(:disabled),.modal input:not([type="file"]),.modal textarea,.modal select,.modal [tabindex="0"]'
          )
        );
        const first = els[0];
        const last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      before?.focus();
    };
  }, [modal]);

  // Persist to localStorage
  useEffect(() => {
    if (allowSave) {
      try {
        setStorageError(save(localStorage, data));
      } catch {
        setStorageError('Không thể truy cập bộ nhớ trình duyệt.');
      }
    }
  }, [data, allowSave]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      audio.current?.dispose();
    };
  }, []);

  const notify = (text: string) => setMessage(text);

  function update(fn: (c: Classroom) => Classroom) {
    setData((d) => ({
      ...d,
      classes: d.classes.map((c) => (c.id === d.active ? fn(c) : c)),
    }));
  }

  function finish() {
    if (!busy.current) return;
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    setRunning(false);
    audio.current?.stop();
    if (soundOn.current) playAudio(true);
  }

  function playAudio(result = false, offset = 0) {
    audio.current ??= new GameAudio();
    void audio.current.play(concept, offset, result).catch(() =>
      notify('Không phát được âm thanh. Hãy thử bật lại biểu tượng loa.')
    );
  }

  function toggleSound() {
    const enabled = !soundOn.current;
    soundOn.current = enabled;
    setSound(enabled);
    if (!enabled) audio.current?.stop();
    else if (busy.current) playAudio(false, (performance.now() - runStarted.current) / 1000);
    else playAudio(true);
  }

  function start() {
    if (busy.current || !current) return;
    try {
      let names: string[] = [];
      let groups: Group[] | null = null;
      let chosen: string[] = [];
      let groupChosen: string[] = [];

      if (mode < 2) {
        const selected = pick(pool, mode === 0 ? 1 : Number(count));
        names = selected.map((s) => s.name);
        chosen = selected.map((s) => s.id);
      } else if (mode === 2) {
        groups = divide(present, Number(groupValue), bySize);
        names = groups.map((g) => `${g.name}: ${g.members.map((s) => s.name).join(', ')}`);
      } else {
        if (stale)
          throw Error('Nhóm cũ không còn khớp danh sách/điểm danh. Hãy chia lại hoặc cập nhật nhóm trước.');
        const eligibleGroups = current.session.groups.filter(
          (g) => !noGroupRepeat || !current.session.groupCalled.includes(g.id)
        );
        if (!eligibleGroups.length)
          throw Error('Đã gọi hết tất cả các nhóm! Hãy bấm Đặt lại lượt nhóm.');
        const g = pick(eligibleGroups, 1)[0];
        names = [g.name, ...g.members.map((s) => s.name)];
        groupChosen = [g.id];
        chosen = g.members.map((s) => s.id);
      }

      busy.current = true;
      const turn = {
        id: uid(),
        at: new Date().toISOString(),
        kind: modes[mode].name,
        names,
      };

      const nextClass = {
        ...current,
        session: {
          ...current.session,
          called: mode < 2 ? [...new Set([...current.session.called, ...chosen])] : current.session.called,
          groupCalled: groups ? [] : [...current.session.groupCalled, ...groupChosen],
          groups: groups ?? current.session.groups,
          signature: groups ? signature(current) : current.session.signature,
          result: names,
          history: [turn, ...current.session.history].slice(0, 1000),
        },
      };

      const nextData = {
        ...data,
        classes: data.classes.map((c) => (c.id === current.id ? nextClass : c)),
      };

      if (allowSave) {
        try {
          setStorageError(save(localStorage, nextData));
        } catch {
          setStorageError('Không lưu được kết quả. Hãy xuất JSON.');
        }
      }

      setData(nextData);
      setSelectedIds(groups ? groups.flatMap((g) => g.members.map((s) => s.id)) : chosen);
      setMessage('');
      setRunning(true);
      runStarted.current = performance.now();

      if (soundOn.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        playAudio();
      }

      timer.current = setTimeout(
        finish,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : ANIMATION_MS
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }

  function newClass() {
    setNewName('');
    setNewList('');
    setCreateError('');
    setModal('create');
  }

  function newSession() {
    if (confirm('Bắt đầu buổi mới? Đặt tất cả có mặt, xóa lịch sử gọi và nhóm. Danh sách lớp được giữ nguyên.')) {
      update((c) => ({ ...c, session: emptySession() }));
      notify('Đã làm mới buổi học.');
    }
  }

  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-len-bang-sao-luu.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('Tệp quá lớn. Giới hạn 5 MB.');
      setPreview(parseBackup(await file.text()));
    } catch (e) {
      notify(`Không nhập được: ${(e as Error).message}`);
    }
  }

  function acceptImport() {
    if (!preview) return;
    if (replace && !confirm('Thay thế các lớp trùng ID hoặc tên? Dữ liệu buổi của những lớp này cũng sẽ được thay thế.'))
      return;

    setData((d) => {
      let classes = [...d.classes];
      for (const incoming of preview.classes) {
        const match = classes.find((c) => c.id === incoming.id || c.name === incoming.name);
        if (replace && match) {
          classes = classes.map((c) => (c.id === match.id ? { ...incoming, id: match.id } : c));
        } else {
          classes.push({
            ...incoming,
            id: uid(),
            name: match ? `${incoming.name} (bản nhập)` : incoming.name,
          });
        }
      }
      if (classes.length > 100) {
        notify('Tổng số lớp vượt 100. Hãy xóa bớt trước khi nhập.');
        return d;
      }
      return { ...d, classes, active: d.active || classes[0]?.id || '' };
    });
    setPreview(null);
    notify('Đã nhập bản sao lưu thành công.');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        (resultIsGroups ? formatGroups(session?.groups || []) : session?.result.join('\n')) || ''
      );
      notify('Đã sao chép kết quả.');
    } catch {
      notify('Không thể truy cập clipboard. Bạn có thể chọn và sao chép văn bản trong phần kết quả.');
    }
  }

  return (
    <div className="app-container">
      {/* Sleek Floating Header */}
      <header className="header">
        <div className="header-left">
          <a href="./" className="brand">
            <span className="brand-icon">
              <GraduationCap size={22} />
            </span>
            <span className="brand-title">
              Ai Lên Bảng<span className="brand-question">?</span>
            </span>
          </a>

          {/* Quick Class Selector in Header */}
          <div className="header-class-pill">
            <GraduationCap size={15} className="pill-icon" />
            <select
              aria-label="Chọn lớp học"
              value={current?.id || ''}
              disabled={running}
              onChange={(e) => setData((d) => ({ ...d, active: e.target.value }))}
            >
              <option value="" disabled>Chọn lớp học</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="class-badge">
              {present.length}/{current?.students.length || 0}
            </span>
            <button
              className="icon-action-btn"
              title="Quản lý & Điểm danh"
              disabled={!current || running}
              onClick={() => setModal('roster')}
            >
              <Pencil size={13} />
            </button>
            <button
              className="icon-action-btn"
              title="Thêm lớp mới"
              disabled={running}
              onClick={newClass}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <span className={`save-status ${storageError ? 'warn' : 'saved'}`}>
            <span className="status-dot" />
            {storageError ? 'Chưa lưu được' : 'Đã lưu trên thiết bị'}
          </span>

          <button
            className="quiet-btn"
            title="Lịch sử gọi"
            onClick={() => setModal('history')}
            disabled={running}
          >
            <History size={15} />
            <span className="btn-label">Lịch sử</span>
            {!!session?.history.length && (
              <span className="history-pill">{session.history.length}</span>
            )}
          </button>

          <button
            className="quiet-btn"
            title="Sao lưu dữ liệu"
            onClick={() => setModal('backup')}
            disabled={running}
          >
            <Download size={15} />
            <span className="btn-label">Sao lưu</span>
          </button>

          <button
            className="quiet-btn"
            title="Làm mới buổi học"
            onClick={newSession}
            disabled={!current || running}
          >
            <RotateCcw size={15} />
            <span className="btn-label">Buổi mới</span>
          </button>
        </div>
      </header>

      <main className="main-viewport">
        {/* Storage Notice / Alerts */}
        {storageError && (
          <div className="alert-banner error" role="alert">
            <AlertCircle size={17} />
            <span>{storageError}</span>
            <button onClick={exportData} className="link-btn">
              Xuất JSON
            </button>
            {!allowSave && (
              <button
                onClick={() => {
                  if (confirm('Cho phép lưu trạng thái hiện tại và ghi đè dữ liệu cũ không đọc được?')) {
                    setAllowSave(true);
                  }
                }}
                className="link-btn"
              >
                Cho phép lưu lại
              </button>
            )}
          </div>
        )}

        {message && (
          <div className="alert-banner info" role="status">
            <Sparkles size={17} />
            <span>{message}</span>
            <button aria-label="Đóng thông báo" onClick={() => setMessage('')} className="close-alert-btn">
              <X size={15} />
            </button>
          </div>
        )}

        {/* 3D Hero Game Stage */}
        <section className="stage-wrapper">
          <div className="game-frame">
            {/* Top Toolbar inside Stage */}
            <div className="game-toolbar">
              <div className="toolbar-info">
                <span className="live-dot" />
                <span className="theme-title">{concepts.find((c) => c.id === concept)?.title}</span>
                <span className="divider">/</span>
                <span className="mode-title">{modes[mode].name}</span>
              </div>

              <div className="toolbar-controls">
                <button
                  className={`toolbar-btn ${sound ? 'active' : ''}`}
                  aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
                  title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
                  aria-pressed={sound}
                  onClick={toggleSound}
                >
                  {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <span>{sound ? 'Có nhạc' : 'Bật nhạc'}</span>
                </button>

                <button
                  className="toolbar-btn"
                  aria-label="Toàn màn hình"
                  title="Toàn màn hình"
                  onClick={() => {
                    const el = document.querySelector('.game-frame');
                    if (document.fullscreenElement) {
                      void document.exitFullscreen().catch(() => notify('Không thể thoát toàn màn hình.'));
                    } else {
                      void el?.requestFullscreen().catch(() => notify('Trình duyệt không hỗ trợ toàn màn hình.'));
                    }
                  }}
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>

            {/* High-Craft Three.js 3D Viewport */}
            <Stage3D
              concept={concept}
              students={present}
              running={running}
              selected={selectedIds}
              groups={mode === 2 ? session?.groups || [] : []}
            />

            {/* Bottom Bar inside Stage */}
            <div className="game-bottom">
              <div className="status-group">
                <span className="ready-pulse-dot" />
                <div>
                  <div className="status-main">
                    {running
                      ? 'Đang tìm bạn may mắn nhất...'
                      : mode < 2
                        ? `${pool.length} bạn sẵn sàng lên bảng`
                        : `${present.length} bạn có mặt`}
                  </div>
                  <div className="status-sub">
                    {running
                      ? 'Hồi hộp đếm ngược 10 giây...'
                      : pool.length === 0 && mode < 2
                        ? 'Đã gọi hết cả lớp! Hãy mở Lịch sử để đặt lại.'
                        : 'Thuật toán ngẫu nhiên Crypto · Không thiên vị'}
                  </div>
                </div>
              </div>

              {running ? (
                <button className="primary-action-btn skip" onClick={finish}>
                  <span>Bỏ qua hoạt cảnh</span>
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="primary-action-btn play"
                  disabled={!current || (!present.length && mode !== 3)}
                  onClick={start}
                >
                  <Play size={18} fill="currentColor" />
                  <span>
                    {mode === 2
                      ? 'Chia nhóm ngay'
                      : mode === 3
                        ? 'Bốc thăm nhóm'
                        : mode === 1
                          ? 'Gọi các bạn'
                          : 'Gọi một bạn'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Playful Theme / Sân chơi Selector */}
        <section className="theme-selector-section">
          <div className="section-header">
            <span className="section-title">Chọn sân chơi 3D</span>
            <span className="section-subtitle">Mỗi thế giới có linh vật, hoạt cảnh & âm nhạc riêng biệt</span>
          </div>

          <div className="concept-cards-grid">
            {concepts.map((c) => {
              const active = concept === c.id;
              return (
                <button
                  key={c.id}
                  disabled={running}
                  className={`concept-pill-card ${c.id} ${active ? 'active' : ''}`}
                  onClick={() => setConcept(c.id)}
                >
                  <div className="concept-card-icon">
                    <Mascot concept={c.id} />
                  </div>
                  <div className="concept-card-body">
                    <div className="concept-tag">{c.tag}</div>
                    <div className="concept-name">{c.title}</div>
                    <div className="concept-sub">{c.sub}</div>
                  </div>
                  {active && (
                    <span className="active-badge">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Floating Activity & Mode Selector Dock */}
        <section className="activity-dock-section">
          <div className="dock-card">
            <div className="dock-modes-nav">
              {modes.map((m, i) => {
                const active = mode === i;
                const Icon = m.icon;
                return (
                  <button
                    key={m.name}
                    disabled={running}
                    className={`dock-mode-btn ${active ? 'active' : ''}`}
                    onClick={() => setMode(i)}
                  >
                    <Icon size={17} />
                    <span className="mode-btn-name">{m.name}</span>
                    <span className="mode-btn-desc">{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode-Specific Parameter Configuration */}
            <div className="dock-params-row">
              {mode === 0 && (
                <div className="param-item">
                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={noRepeat}
                      onChange={(e) => setNoRepeat(e.target.checked)}
                    />
                    <span>Không gọi lại các bạn đã lên bảng trong buổi</span>
                  </label>
                  <span className="param-hint">
                    ({current?.session.called.length || 0} bạn đã được gọi)
                  </span>
                </div>
              )}

              {mode === 1 && (
                <div className="param-item flex-wrap">
                  <div className="number-stepper">
                    <span className="stepper-label">Số bạn cần gọi:</span>
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => setCount((c) => String(Math.max(1, Number(c) - 1)))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={pool.length || 1}
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                    />
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => setCount((c) => String(Math.min(pool.length || 50, Number(c) + 1)))}
                    >
                      +
                    </button>
                  </div>

                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={noRepeat}
                      onChange={(e) => setNoRepeat(e.target.checked)}
                    />
                    <span>Không gọi lại bạn cũ</span>
                  </label>
                </div>
              )}

              {mode === 2 && (
                <div className="param-item flex-wrap">
                  <div className="group-split-type">
                    <select
                      aria-label="Cách chia nhóm"
                      value={bySize ? 'size' : 'count'}
                      onChange={(e) => setBySize(e.target.value === 'size')}
                    >
                      <option value="count">Theo số nhóm</option>
                      <option value="size">Số người tối đa / nhóm</option>
                    </select>

                    <input
                      aria-label="Số lượng chia nhóm"
                      type="number"
                      min="1"
                      max={present.length || 10}
                      value={groupValue}
                      onChange={(e) => setGroupValue(e.target.value)}
                    />
                  </div>

                  <span className="param-hint">
                    Chia đều {present.length} bạn có mặt (chênh lệch tối đa 1 người).
                  </span>
                </div>
              )}

              {mode === 3 && (
                <div className="param-item column">
                  <div className="param-row-between">
                    <label className="checkbox-pill">
                      <input
                        type="checkbox"
                        checked={noGroupRepeat}
                        onChange={(e) => setNoGroupRepeat(e.target.checked)}
                      />
                      <span>Không bốc thăm lại nhóm đã chọn</span>
                    </label>

                    <button
                      className="text-link-btn"
                      onClick={() => update((c) => ({ ...c, session: { ...c.session, groupCalled: [] } }))}
                    >
                      <RefreshCw size={13} />
                      <span>Đặt lại lượt bốc nhóm</span>
                    </button>
                  </div>

                  <div className="manual-groups-box">
                    <textarea
                      aria-label="Tên nhóm có sẵn"
                      placeholder="Hoặc dán danh sách nhóm thủ công ở đây (mỗi dòng một nhóm)..."
                      value={manualGroups}
                      onChange={(e) => setManualGroups(e.target.value)}
                    />
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        const names = manualGroups
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (!names.length || names.length > 100 || names.some((n) => n.length > 150)) {
                          notify('Nhập 1–100 tên nhóm, mỗi tên tối đa 150 ký tự.');
                          return;
                        }
                        if (session?.groups.length && !confirm('Thay thế danh sách nhóm hiện tại?')) return;
                        update((c) => ({
                          ...c,
                          session: {
                            ...c.session,
                            groups: names.map((name) => ({ id: uid(), name, members: [] })),
                            groupCalled: [],
                            signature: '',
                          },
                        }));
                        setManualGroups('');
                        notify(`Đã cập nhật ${names.length} nhóm mới.`);
                      }}
                    >
                      Áp dụng danh sách này
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Warning if group roster changed */}
        {stale && (
          <div className="alert-banner warning">
            <AlertCircle size={18} />
            <span>
              Danh sách hoặc điểm danh của lớp đã thay đổi so với các nhóm trước đó. Hãy chia lại nhóm để đồng bộ!
            </span>
            <button disabled={running} onClick={() => setMode(2)} className="link-btn">
              Chia lại nhóm ngay
            </button>
          </div>
        )}

        {/* Results Presentation Section */}
        <section className="results-container">
          <div className="results-header">
            <div>
              <div className="section-label">BẢNG KẾT QUẢ</div>
              <h3>
                {running
                  ? 'Cả lớp đang rượt đuổi sôi nổi...'
                  : session?.result.length
                    ? resultIsGroups
                      ? 'Kết quả chia nhóm lớp học'
                      : 'Chúc mừng bạn đã được chọn!'
                    : 'Chưa có lượt gọi nào'}
              </h3>
            </div>

            {!!session?.result.length && !running && (
              <button className="copy-action-btn" onClick={copy}>
                <Copy size={15} />
                <span>Sao chép kết quả</span>
              </button>
            )}
          </div>

          {!running && !!session?.result.length ? (
            <div className="result-display-card" aria-live="polite">
              <div className="result-announcement">
                <Sparkles size={16} />
                <span>{concepts.find((c) => c.id === concept)?.line}</span>
              </div>

              {resultIsGroups ? (
                <div className="groups-card-grid">
                  {session.groups.map((g, i) => (
                    <article className="group-detail-card" key={g.id}>
                      <div className="group-card-top">
                        <span className="group-num-badge">{String(i + 1).padStart(2, '0')}</span>
                        <input
                          aria-label={'Tên nhóm ' + (i + 1)}
                          value={g.name}
                          maxLength={150}
                          onBlur={() => {
                            if (!g.name.trim())
                              update((c) => ({
                                ...c,
                                session: {
                                  ...c.session,
                                  groups: c.session.groups.map((x) =>
                                    x.id === g.id ? { ...x, name: 'Nhóm ' + (i + 1) } : x
                                  ),
                                },
                              }));
                          }}
                          onChange={(e) =>
                            update((c) => ({
                              ...c,
                              session: {
                                ...c.session,
                                groups: c.session.groups.map((x) =>
                                  x.id === g.id ? { ...x, name: e.target.value || 'Nhóm' } : x
                                ),
                              },
                            }))
                          }
                        />
                        <span className="member-count-pill">{g.members.length} bạn</span>
                      </div>

                      <ol className="group-members-list">
                        {g.members.map((student) => (
                          <li key={student.id}>
                            <span className="member-name">{student.name}</span>
                            {student.code && <span className="member-code">{student.code}</span>}
                          </li>
                        ))}
                      </ol>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="names-callout-grid">
                  {session.result.map((name, i) => (
                    <div className="called-name-chip" key={i}>
                      <span className="star-icon">✦</span>
                      <span className="name-text">{name}</span>
                    </div>
                  ))}
                </div>
              )}

              {resultIsGroups && (
                <div className="group-quick-actions">
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setMode(2);
                      notify('Điều chỉnh thông số chia nhóm rồi bấm Chia nhóm ngay.');
                    }}
                  >
                    <Shuffle size={15} />
                    <span>Chia lại các nhóm</span>
                  </button>
                  <button className="secondary-btn" onClick={() => setMode(3)}>
                    <Layers size={15} />
                    <span>Bốc thăm các nhóm này</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-results-box">
              <Sparkles size={28} className="empty-sparkle" />
              <p>{running ? 'Kết quả sẽ hiển thị ngay khi linh vật tiếp cận mục tiêu.' : 'Bấm nút gọi bạn để bắt đầu lượt chơi đầu tiên.'}</p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer-bar">
          <div className="footer-left">
            <GraduationCap size={16} />
            <span>Ai Lên Bảng? — Trợ lý lớp học ngẫu nhiên 3D</span>
          </div>
          <div className="footer-right">
            <span>Dữ liệu an toàn & lưu trữ 100% trên trình duyệt của bạn</span>
          </div>
        </footer>
      </main>

      {/* MODALS & DRAWERS */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === 'create'
                ? 'Tạo lớp học mới'
                : modal === 'roster'
                  ? 'Quản lý lớp học'
                  : modal === 'history'
                    ? 'Lịch sử buổi học'
                    : 'Sao lưu dữ liệu'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {modal === 'create'
                  ? 'Tạo lớp học mới'
                  : modal === 'roster'
                    ? `Quản lý: ${current?.name}`
                    : modal === 'history'
                      ? 'Lịch sử lượt gọi'
                      : 'Sao lưu & Khôi phục'}
              </h2>
              <button
                className="close-modal-btn"
                aria-label="Đóng cửa sổ"
                autoFocus
                onClick={() => setModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal: Tạo lớp mới */}
            {modal === 'create' && (
              <form
                className="modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const next = createClass(data, newName, newList);
                    setData(next);
                    setBulk('');
                    setSearch('');
                    setMessage(`Đã tạo lớp ${newName.trim()} thành công.`);
                    setModal('roster');
                  } catch (error) {
                    setCreateError((error as Error).message);
                  }
                }}
              >
                <div className="form-field">
                  <label>Tên lớp học</label>
                  <input
                    className="styled-input"
                    autoFocus
                    required
                    maxLength={150}
                    placeholder="Ví dụ: PNV28A, K68-CNTT..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>
                    Danh sách sinh viên <span className="field-hint">(có thể thêm sau)</span>
                  </label>
                  <textarea
                    rows={6}
                    className="styled-textarea"
                    value={newList}
                    onChange={(e) => setNewList(e.target.value)}
                    placeholder={'Dán danh sách từ Excel/Word, mỗi dòng 1 tên:\nNguyễn Minh Anh\nTrần Hoàng Nam\n\nHoặc cột Mã | Tên'}
                  />
                </div>

                {createError && <p className="alert-banner error">{createError}</p>}

                <div className="modal-actions-bar">
                  <button type="button" className="secondary-btn" onClick={() => setModal(null)}>
                    Hủy
                  </button>
                  <button type="submit" className="primary-action-btn">
                    <Plus size={16} />
                    <span>Tạo lớp học</span>
                  </button>
                </div>
              </form>
            )}

            {/* Modal: Quản lý danh sách & Điểm danh */}
            {modal === 'roster' && current && (
              <div className="roster-modal-content">
                <div className="roster-top-actions">
                  <div className="class-title-info">
                    <strong>{current.name}</strong>
                    <span className="stats-tag">
                      {present.length} có mặt / {current.students.length} sinh viên
                    </span>
                  </div>

                  <div className="class-edit-actions">
                    <button
                      className="quiet-btn"
                      disabled={current.id === FIXED_CLASS_ID}
                      onClick={() => {
                        const name = prompt('Đổi tên lớp thành:', current.name);
                        if (name?.trim()) update((c) => ({ ...c, name: name.trim().slice(0, 150) }));
                      }}
                    >
                      <Pencil size={14} />
                      <span>Đổi tên</span>
                    </button>
                    <button
                      className="danger-btn"
                      disabled={current.id === FIXED_CLASS_ID}
                      onClick={() => {
                        if (confirm(`Xóa lớp ${current.name} và toàn bộ dữ liệu buổi học?`)) {
                          setData((d) => {
                            const classes = d.classes.filter((c) => c.id !== current.id);
                            return { ...d, classes, active: classes[0]?.id || '' };
                          });
                          setModal(null);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Xóa lớp</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Import from Excel */}
                {current.id !== FIXED_CLASS_ID && (
                  <div className="bulk-import-card">
                    <div className="bulk-import-header">
                      <FileText size={16} />
                      <span>Dán danh sách từ Excel / Word (Tên hoặc STT - Mã - Tên)</span>
                    </div>
                    <textarea
                      id="bulk-students"
                      className="styled-textarea"
                      value={bulk}
                      onChange={(e) => setBulk(e.target.value)}
                      placeholder={'Dán cột tên hoặc copy từ bảng Excel vào đây...\nNguyễn Văn A\nTrần Thị B'}
                    />
                    <div className="bulk-actions-row">
                      <span className="bulk-count-badge">
                        {bulk.trim() ? bulk.split(/\r?\n/).filter((x) => x.trim()).length : 0} dòng
                      </span>
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          try {
                            const students = parseStudents(bulk);
                            if (!students.length) throw Error('Hãy nhập ít nhất một sinh viên.');
                            if (students.length + current.students.length > 2000)
                              throw Error('Lớp vượt giới hạn 2.000 sinh viên.');
                            const names = [...current.students, ...students].map((s) => s.name.toLowerCase());
                            if (new Set(names).size < names.length) {
                              notify('Có bạn trùng tên. Mỗi bạn vẫn có mã riêng biệt.');
                            }
                            update((c) => ({ ...c, students: [...c.students, ...students] }));
                            setBulk('');
                            notify(`Đã thêm ${students.length} sinh viên vào lớp.`);
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        <Plus size={15} />
                        <span>Thêm vào lớp</span>
                      </button>
                    </div>
                  </div>
                )}

                {current.id === FIXED_CLASS_ID && (
                  <p className="notice-text">
                    Lớp <strong>PNV27A</strong> gồm 22 bạn sinh viên có sẵn. Bạn có thể điểm danh vắng/có mặt hoặc tùy chỉnh giới tính/avatar cho từng bạn dưới đây.
                  </p>
                )}

                {/* Search & Student List */}
                <div className="student-search-bar">
                  <Search size={16} />
                  <input
                    placeholder="Tìm kiếm sinh viên theo tên hoặc mã..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="students-scroll-list">
                  {current.students
                    .filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase()))
                    .map((s, i) => {
                      const isAbsent = session?.absent.includes(s.id);
                      return (
                        <div className={`student-item-row ${isAbsent ? 'absent' : 'present'}`} key={s.id}>
                          <label className="attendance-checkbox" title="Đánh dấu có mặt / vắng">
                            <input
                              type="checkbox"
                              checked={!isAbsent}
                              onChange={() =>
                                update((c) => ({
                                  ...c,
                                  session: {
                                    ...c.session,
                                    absent: isAbsent
                                      ? c.session.absent.filter((id) => id !== s.id)
                                      : [...c.session.absent, s.id],
                                  },
                                }))
                              }
                            />
                            <span className="custom-check-box" />
                          </label>

                          <div className="student-avatar-badge">
                            {s.avatar === 'female' ? '👧' : s.avatar === 'male' ? '👦' : '🎒'}
                          </div>

                          <div className="student-name-box">
                            <span className="student-full-name">{s.name}</span>
                            {s.code && <span className="student-code-tag">{s.code}</span>}
                          </div>

                          <select
                            className="avatar-type-select"
                            value={s.avatar || ''}
                            onChange={(e) =>
                              update((c) => ({
                                ...c,
                                students: c.students.map((x) =>
                                  x.id === s.id
                                    ? { ...x, avatar: (e.target.value || undefined) as 'male' | 'female' | undefined }
                                    : x
                                ),
                              }))
                            }
                          >
                            <option value="">Tự động</option>
                            <option value="male">Nam 👦</option>
                            <option value="female">Nữ 👧</option>
                          </select>

                          {current.id !== FIXED_CLASS_ID && (
                            <div className="student-row-tools">
                              <button
                                className="icon-tool-btn"
                                title="Sửa tên / mã"
                                onClick={() => {
                                  const line = prompt('Tên hoặc Mã | Tên:', s.code ? `${s.code} | ${s.name}` : s.name);
                                  if (line === null) return;
                                  try {
                                    const parsed = parseStudents(line);
                                    if (parsed.length !== 1) throw Error('Nhập đúng một sinh viên.');
                                    update((c) => ({
                                      ...c,
                                      students: c.students.map((x) => (x.id === s.id ? { ...parsed[0], id: s.id } : x)),
                                    }));
                                  } catch (e) {
                                    notify((e as Error).message);
                                  }
                                }}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="icon-tool-btn danger"
                                title="Xóa sinh viên"
                                onClick={() => {
                                  if (confirm(`Xóa bạn ${s.name}? Lịch sử buổi học vẫn được giữ lại.`)) {
                                    update((c) => ({
                                      ...c,
                                      students: c.students.filter((x) => x.id !== s.id),
                                    }));
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Modal: Lịch sử buổi học */}
            {modal === 'history' && (
              <div className="history-modal-content">
                <div className="history-info-banner">
                  <span>{current?.name || 'Chưa chọn lớp'}</span>
                  <span>•</span>
                  <span>{session?.history.length || 0} lượt trong buổi hiện tại</span>
                </div>

                <div className="history-timeline-list">
                  {session?.history.map((t) => (
                    <article className="history-entry" key={t.id}>
                      <div className="history-entry-time">
                        <span className="time-badge">{new Date(t.at).toLocaleTimeString('vi-VN')}</span>
                        <span className="kind-badge">{t.kind}</span>
                      </div>
                      <div className="history-entry-names">{t.names.join(' • ')}</div>
                    </article>
                  ))}
                  {!session?.history.length && (
                    <div className="empty-history-text">
                      Chưa có lượt gọi nào trong buổi này. Cùng bắt đầu gọi bạn đầu tiên nhé!
                    </div>
                  )}
                </div>

                <div className="modal-actions-bar">
                  <button
                    className="danger-btn"
                    disabled={!current || !session?.history.length}
                    onClick={() => {
                      if (confirm('Xóa lịch sử gọi sinh viên để có thể gọi lại? Lượt nhóm vẫn được giữ riêng.')) {
                        update((c) => ({
                          ...c,
                          session: {
                            ...c.session,
                            called: [],
                            history: c.session.history.filter(
                              (t) => t.kind !== 'Chọn một người' && t.kind !== 'Chọn nhiều người'
                            ),
                          },
                        }));
                        notify('Đã đặt lại lịch sử gọi.');
                      }
                    }}
                  >
                    <RotateCcw size={15} />
                    <span>Đặt lại lịch sử gọi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal: Sao lưu & Khôi phục */}
            {modal === 'backup' && (
              <div className="backup-modal-content">
                <p className="backup-desc">
                  Toàn bộ danh sách lớp học và buổi học được lưu cục bộ trên trình duyệt này. Hãy tải bản sao lưu JSON định kỳ để không lo mất dữ liệu khi xóa cache trình duyệt.
                </p>

                <div className="backup-options-grid">
                  <button className="backup-action-card" onClick={exportData}>
                    <Download size={26} className="card-icon" />
                    <strong>Xuất bản sao lưu JSON</strong>
                    <span>Tải về tệp .json an toàn cho máy</span>
                  </button>

                  <label className="backup-action-card upload">
                    <Upload size={26} className="card-icon" />
                    <strong>Khôi phục từ tệp JSON</strong>
                    <span>Chọn tệp đã sao lưu để khôi phục</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => void importFile(e.target.files?.[0])}
                    />
                  </label>
                </div>

                {preview && (
                  <div className="preview-import-panel">
                    <h4>Xem trước dữ liệu tệp</h4>
                    <p>
                      Có <strong>{preview.classes.length} lớp</strong> với tổng cộng{' '}
                      <strong>{preview.classes.reduce((n, c) => n + c.students.length, 0)} sinh viên</strong>
                    </p>
                    <ul className="preview-classes-list">
                      {preview.classes.map((c) => (
                        <li key={c.id}>
                          <span>{c.name}</span>
                          <span className="count">({c.students.length} bạn)</span>
                          {data.classes.some((x) => x.id === c.id || x.name === c.name) && (
                            <span className="match-tag">Trùng lớp có sẵn</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <label className="checkbox-pill">
                      <input
                        type="checkbox"
                        checked={replace}
                        onChange={(e) => setReplace(e.target.checked)}
                      />
                      <span>Thay thế các lớp trùng tên/ID (thay vì thêm bản sao)</span>
                    </label>

                    <button className="primary-action-btn import-confirm" onClick={acceptImport}>
                      <CheckCircle2 size={16} />
                      <span>Xác nhận nhập dữ liệu</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
