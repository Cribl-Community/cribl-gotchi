import { useCallback, useEffect, useRef, useState } from 'react';
import { currentUser, displayName, loadSave, sendTick } from './api.ts';
import { beep } from './beep.ts';
import { GameOverDialog, GravesDialog, HatchDialog, LogsDialog, SettingsDialog, ShopDialog, StyleDialog } from './components/Dialogs.tsx';
import { Shell } from './components/Shell.tsx';
import type { CriblUser } from './cribl';
import { debugLog, getLogs, hostSnapshot, subscribeLogs, type LogLine } from './debugLog.ts';
import type { Action, UserSave } from './game/types.ts';

type Modal = 'hatch' | 'shop' | 'graves' | 'settings' | 'style' | 'gameover' | 'logs' | null;
type Confirm = 'yeet' | 'forget' | null;

function webhookHost(raw: string): 'slack' | 'discord' | null {
  try {
    const host = new URL(raw.trim()).hostname;
    if (host === 'hooks.slack.com') return 'slack';
    if (host === 'discord.com' || host === 'discordapp.com') return 'discord';
  } catch {
    return null;
  }
  return null;
}

export default function App() {
  const [user, setUser] = useState<CriblUser | null>(null);
  const [save, setSave] = useState<UserSave | null>(null);
  const [summary, setSummary] = useState('Booting the plastic. Do not tap the egg.');
  const [events, setEvents] = useState<string[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [webhookDraft, setWebhookDraft] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [screamNote, setScreamNote] = useState('');
  const userRef = useRef<CriblUser | null>(null);
  const saveRef = useRef<UserSave | null>(null);
  const webhookRef = useRef('');
  const busyRef = useRef(false);

  const run = useCallback(async (action: Action | null, extras: { gremlinFeed?: boolean } = {}) => {
    const who = userRef.current;
    const current = saveRef.current;
    if (!who || !current || busyRef.current) return;
    busyRef.current = true;
    try {
      const result = await sendTick(who, current, action, {
        gremlinFeed: extras.gremlinFeed,
        sessionWebhook: webhookRef.current,
      });
      saveRef.current = result.save;
      setSave(result.save);
      setSummary(
        result.local && !window.CRIBL_API_URL
          ? `${result.telemetrySummary} (local plastic, no Cribl host)`
          : result.telemetrySummary,
      );
      if (result.events.length) setEvents(result.events.slice(-5));
      if (action?.type === 'test_scream') {
        const note = result.alertSent
          ? 'Scream delivered by the backend. Go look at the channel.'
          : result.local
            ? 'No backend answered, so nothing was sent. Live Preview must deploy the app first (see Logs).'
            : 'The backend ran but sent nothing. Check the webhook URL and the events line.';
        setScreamNote(note);
        setEvents((prev) => [...prev.slice(-4), note]);
      }
      if (result.died) setModal('gameover');
      const kind = result.died
        ? 'dead'
        : extras.gremlinFeed || action?.type === 'summon'
          ? 'alert'
          : action
            ? action.type === 'pet' || action.type === 'hatch'
              ? 'happy'
              : 'tap'
            : null;
      if (kind) beep(kind, result.save.settings.muteScreams);
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      setSummary(raw.startsWith('{') ? 'The workspace tick missed. Open Logs.' : raw || 'The tick fell over and filed a postmortem.');
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => subscribeLogs(() => setLogs(getLogs())), []);

  useEffect(() => {
    debugLog('info', `boot ${hostSnapshot()}`);
    void (async () => {
      const who = await currentUser();
      userRef.current = who;
      setUser(who);
      const loaded = await loadSave(who);
      saveRef.current = loaded;
      setSave(loaded);
      setSummary(window.CRIBL_API_URL ? 'Connected. The pet can see the leader. It is not impressed.' : 'No Cribl host. Local gremlin mode. Fake a storm anyway.');
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void run(null);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [user, run]);

  const ask = (kind: Confirm) => setConfirm(kind);

  return (
    <div className="desk">
      <div className="sticker sticker-a">DO NOT FEED AFTER MIDNIGHT.<br />OR DURING A BRIDGE.</div>
      <div className="sticker sticker-b">BATTERIES NOT INCLUDED. REGEX IS.</div>
      <header className="desk-head">
        <h1>Cribl-gotchi</h1>
        <p>{user ? `keeper: ${displayName(user)}` : 'finding a keeper...'}</p>
      </header>
      <Shell
        save={save}
        summary={summary}
        onFeed={() => void run({ type: 'feed' })}
        onPet={() => void run({ type: 'pet' })}
        onClean={() => void run({ type: 'clean' })}
        onSummon={() => void run({ type: 'summon' })}
        onStorm={() => void run(null, { gremlinFeed: true })}
        onFix={() => void run({ type: 'fix_regex' })}
        onPayJam={() => void run({ type: 'pay_jam' })}
        onOpen={(next) => setModal(next)}
      />
      {events.length > 0 && (
        <ul className="event-log">
          {events.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      )}
      {save && modal === 'hatch' && (
        <HatchDialog save={save} onClose={() => setModal(null)} onHatch={(action) => { setModal(null); void run(action); }} />
      )}
      {save && modal === 'style' && (
        <StyleDialog save={save} onClose={() => setModal(null)} onStyle={(look) => { setModal(null); void run({ type: 'style', look }); }} />
      )}
      {save && modal === 'shop' && (
        <ShopDialog save={save} onClose={() => setModal(null)} onBuy={(itemId) => void run({ type: 'buy', itemId })} />
      )}
      {save && modal === 'graves' && <GravesDialog save={save} onClose={() => setModal(null)} />}
      {modal === 'logs' && <LogsDialog lines={logs} onClose={() => setModal(null)} />}
      {save && modal === 'settings' && (
        <SettingsDialog
          save={save}
          webhookDraft={webhookDraft}
          onWebhookDraft={(value) => {
            webhookRef.current = value;
            setWebhookDraft(value);
          }}
          onClose={() => setModal(null)}
          onSave={(alertThresholdHealth, muteScreams) => void run({ type: 'settings', alertThresholdHealth, muteScreams })}
          onArm={() => {
            const host = webhookHost(webhookDraft);
            if (!host) {
              setEvents(['Paste a Slack or Discord webhook. The pet will not scream into a random URL.']);
              return;
            }
            void run({ type: 'arm_webhook', host });
          }}
          onDisarm={() => ask('forget')}
          screamNote={screamNote}
          onTest={() => {
            setScreamNote('Yelling into the pipe...');
            void run({ type: 'test_scream' });
          }}
          onDilate={(factor) => void run({ type: 'dilation', factor })}
          onAbandon={() => ask('yeet')}
        />
      )}
      {save && modal === 'gameover' && (
        <GameOverDialog
          save={save}
          onClose={() => setModal(null)}
          onHatch={() => setModal('hatch')}
        />
      )}
      {confirm && (
        <div className="modal-back">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>{confirm === 'yeet' ? 'Yeet this pet?' : 'Forget the scream pipe?'}</h2>
            <p className="hint">
              {confirm === 'yeet'
                ? 'This writes a grave and deletes the living pet. The workspace is fine. The pet is not.'
                : 'This deletes the encrypted webhook. You will have to paste it again. The pet will enjoy the silence too much.'}
            </p>
            <div className="btn-row">
              <button type="button" className="toy-btn" onClick={() => setConfirm(null)}>Never mind</button>
              <button
                type="button"
                className="toy-btn chaos"
                onClick={() => {
                  const kind = confirm;
                  setConfirm(null);
                  if (kind === 'yeet') void run({ type: 'abandon' });
                  else void run({ type: 'disarm_webhook' });
                }}
              >
                Yes, be terrible
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
