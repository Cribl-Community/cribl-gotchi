import { useMemo, useState, type ReactNode } from 'react';
import { clearLogs, formatLogs, type LogLine } from '../debugLog.ts';
import { DIFFICULTIES, FEATURES, HATS, PALETTES, SHOP, SIZES, randomName, stageName } from '../game/catalog.ts';
import { previewPet } from '../game/engine.ts';
import type { Action, ColorId, Difficulty, FeatureId, HatId, Look, SizeId, UserSave } from '../game/types.ts';
import { PetCanvas } from './PetCanvas.tsx';

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="text-btn" onClick={onClose}>close</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function LookPicker({
  unlocks,
  look,
  onChange,
}: {
  unlocks: UserSave['unlocks'];
  look: Look;
  onChange: (look: Look) => void;
}) {
  const toggle = (feature: FeatureId) => {
    const has = look.features.includes(feature);
    const features = has ? look.features.filter((item) => item !== feature) : [...look.features, feature].slice(-3);
    onChange({ ...look, features });
  };
  return (
    <div className="picker">
      <p className="hint">Size, color, up to three features, one hat. The pet will complain either way.</p>
      <div className="choice-row">
        {(Object.keys(SIZES) as SizeId[]).map((size) => (
          <button
            key={size}
            type="button"
            disabled={!unlocks.sizes.includes(size)}
            className={look.size === size ? 'choice on' : 'choice'}
            onClick={() => onChange({ ...look, size })}
          >
            {SIZES[size].name}
          </button>
        ))}
      </div>
      <div className="choice-row">
        {(Object.keys(PALETTES) as ColorId[]).map((color) => (
          <button
            key={color}
            type="button"
            disabled={!unlocks.colors.includes(color)}
            className={look.color === color ? 'choice on' : 'choice'}
            onClick={() => onChange({ ...look, color })}
            style={{ borderColor: PALETTES[color].body }}
          >
            {PALETTES[color].name}
          </button>
        ))}
      </div>
      <div className="choice-row">
        {(Object.keys(FEATURES) as FeatureId[]).map((feature) => (
          <button
            key={feature}
            type="button"
            disabled={!unlocks.features.includes(feature)}
            className={look.features.includes(feature) ? 'choice on' : 'choice'}
            onClick={() => toggle(feature)}
          >
            {FEATURES[feature].name}
          </button>
        ))}
      </div>
      <div className="choice-row">
        <button type="button" className={look.hat === null ? 'choice on' : 'choice'} onClick={() => onChange({ ...look, hat: null })}>
          No hat
        </button>
        {(Object.keys(HATS) as HatId[]).map((hat) => (
          <button
            key={hat}
            type="button"
            disabled={!unlocks.hats.includes(hat)}
            className={look.hat === hat ? 'choice on' : 'choice'}
            onClick={() => onChange({ ...look, hat })}
          >
            {HATS[hat].name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HatchDialog({
  save,
  onClose,
  onHatch,
}: {
  save: UserSave;
  onClose: () => void;
  onHatch: (action: Extract<Action, { type: 'hatch' }>) => void;
}) {
  const [name, setName] = useState(randomName(Date.now()));
  const [difficulty, setDifficulty] = useState<Difficulty>('chaos');
  const [look, setLook] = useState<Look>({ size: 'chonk', color: 'lcd', features: ['unibrow'], hat: null });
  const preview = useMemo(() => previewPet(name, difficulty, look, Date.now()), [name, difficulty, look]);
  return (
    <Modal title="Hatch a problem" onClose={onClose}>
      <div className="split">
        <PetCanvas pet={preview} />
        <div>
          <label className="field">
            Name
            <input value={name} maxLength={18} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="button" className="text-btn" onClick={() => setName(randomName(Date.now() + Math.random() * 1000))}>
            random shame
          </button>
          <div className="choice-row">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((id) => (
              <button key={id} type="button" className={difficulty === id ? 'choice on' : 'choice'} onClick={() => setDifficulty(id)}>
                <strong>{DIFFICULTIES[id].label}</strong>
                <span>{DIFFICULTIES[id].tagline}</span>
                <span>{DIFFICULTIES[id].blurb}</span>
              </button>
            ))}
          </div>
          <LookPicker unlocks={save.unlocks} look={look} onChange={setLook} />
          <button type="button" className="toy-btn warn" onClick={() => onHatch({ type: 'hatch', name, difficulty, look })}>
            Hatch this mistake
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function StyleDialog({
  save,
  onClose,
  onStyle,
}: {
  save: UserSave;
  onClose: () => void;
  onStyle: (look: Look) => void;
}) {
  const pet = save.current;
  const [look, setLook] = useState<Look>(pet?.look ?? { size: 'chonk', color: 'lcd', features: ['unibrow'], hat: null });
  const preview = useMemo(
    () => (pet ? { ...pet, look } : previewPet('Preview', 'easy', look, Date.now())),
    [pet, look],
  );
  return (
    <Modal title="Style crimes" onClose={onClose}>
      <div className="split">
        <PetCanvas pet={preview} />
        <div>
          <LookPicker unlocks={save.unlocks} look={look} onChange={setLook} />
          <button type="button" className="toy-btn" onClick={() => onStyle(look)} disabled={!pet?.isAlive}>
            Apply this crime
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ShopDialog({
  save,
  onClose,
  onBuy,
}: {
  save: UserSave;
  onClose: () => void;
  onBuy: (itemId: string) => void;
}) {
  const owned = new Set<string>([
    ...save.unlocks.colors,
    ...save.unlocks.sizes,
    ...save.unlocks.features,
    ...save.unlocks.hats,
  ]);
  return (
    <Modal title="Byte-Coin boutique" onClose={onClose}>
      <p className="hint">Balance: {Math.floor(save.current?.byteCoins ?? 0)} $BC. Not legal tender. Extremely emotional tender.</p>
      <ul className="shop-list">
        {SHOP.map((item) => {
          const id = item.color ?? item.size ?? item.feature ?? item.hat ?? item.id;
          const have = owned.has(id);
          return (
            <li key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.blurb}</p>
              </div>
              <button type="button" className="toy-btn tiny" disabled={have || !save.current?.isAlive} onClick={() => onBuy(item.id)}>
                {have ? 'owned' : `${item.price} $BC`}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function GravesDialog({ save, onClose }: { save: UserSave; onClose: () => void }) {
  const hall = save.hall;
  return (
    <Modal title="Hall of shame" onClose={onClose}>
      <p className="hint">
        Longest life: {hall.longestLifePetName || 'nobody yet'} ({Math.floor(hall.longestLifeSeconds)}s).
        Games: {hall.totalGamesPlayed}. Chaos funerals: {hall.chaosModeDeaths}. Gremlins summoned: {hall.gremlinsSummoned}.
      </p>
      <p className="hint">Titles: {hall.titles.length ? hall.titles.join(', ') : 'none. give it time, or a bad idea.'}</p>
      <ul className="grave-list">
        {save.graveyard.length === 0 && <li>The graveyard is empty. This will not last.</li>}
        {save.graveyard.map((grave) => (
          <li key={grave.petId}>
            <strong>{grave.name}</strong> · {grave.difficulty} · {stageName(grave.maxLevelReached >= 25 ? 3 : grave.maxLevelReached >= 10 ? 2 : 1)}
            <p>{grave.causeOfDeath}</p>
            <p>{grave.epitaph}</p>
            <p>{Math.floor(grave.lifespanSeconds)}s · {grave.totalGbProcessed} GB processed, allegedly</p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export function SettingsDialog({
  save,
  webhookDraft,
  onWebhookDraft,
  onClose,
  onSave,
  onArm,
  onDisarm,
  onTest,
  screamNote,
  onDilate,
  onAbandon,
}: {
  save: UserSave;
  webhookDraft: string;
  onWebhookDraft: (value: string) => void;
  onClose: () => void;
  onSave: (alertThresholdHealth: number, muteScreams: boolean) => void;
  onArm: () => void;
  onDisarm: () => void;
  onTest: () => void;
  screamNote: string;
  onDilate: (factor: number) => void;
  onAbandon: () => void;
}) {
  const [threshold, setThreshold] = useState(save.settings.alertThresholdHealth);
  const [mute, setMute] = useState(save.settings.muteScreams);
  return (
    <Modal title="Knobs and bad ideas" onClose={onClose}>
      <label className="field">
        Scream when health drops under {threshold}%
        <input type="range" min={5} max={90} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
      </label>
      <label className="check">
        <input type="checkbox" checked={mute} onChange={(event) => setMute(event.target.checked)} />
        Mute beeps and screams (coward mode)
      </label>
      <button type="button" className="toy-btn tiny" onClick={() => onSave(threshold, mute)}>Save knobs</button>
      <p className="hint">Meeting Time Dilation speeds hunger and damage. It does not cheat the 24-hour trophies. Those require actual time, you monster.</p>
      <div className="choice-row">
        {[1, 60, 600].map((factor) => (
          <button key={factor} type="button" className={save.settings.timeDilation === factor ? 'choice on' : 'choice'} onClick={() => onDilate(factor)}>
            {factor === 1 ? '1x real time' : factor === 60 ? '60x standup' : '600x incident bridge'}
          </button>
        ))}
      </div>
      <label className="field">
        Slack or Discord webhook
        <input
          type="password"
          autoComplete="off"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookDraft}
          onChange={(event) => onWebhookDraft(event.target.value)}
        />
      </label>
      <p className="hint">
        Paste a Discord webhook (`https://discord.com/api/webhooks/...`) or a Slack incoming webhook, then Test. That uses the URL in this box immediately. Arm stores an encrypted copy for later death screams. This box cannot show an encrypted URL again. Status: {save.settings.webhookArmed ? `armed (${save.settings.webhookHost})` : 'silent'}.
      </p>
      {screamNote && <p className="hint">{screamNote}</p>}
      <div className="btn-row">
        <button type="button" className="toy-btn tiny" onClick={onArm}>Arm scream pipe</button>
        <button type="button" className="toy-btn tiny" onClick={onTest}>Test scream</button>
        <button type="button" className="toy-btn tiny" onClick={onDisarm}>Forget pipe</button>
      </div>
      <button type="button" className="toy-btn chaos" onClick={onAbandon} disabled={!save.current?.isAlive}>
        Yeet current pet
      </button>
    </Modal>
  );
}

export function LogsDialog({
  lines,
  onClose,
}: {
  lines: LogLine[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = formatLogs();
  return (
    <Modal title="Black box" onClose={onClose}>
      <p className="hint">Paste this back. Webhook URLs are redacted. The pet is not.</p>
      <pre className="log-box">{lines.length ? lines.map((line) => `${line.at} ${line.level.toUpperCase()} ${line.message}`).join('\n') : 'No ticks yet. Press a button.'}</pre>
      <div className="btn-row">
        <button
          type="button"
          className="toy-btn tiny"
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }).catch(() => setCopied(false));
          }}
        >
          {copied ? 'copied' : 'copy logs'}
        </button>
        <button type="button" className="toy-btn tiny" onClick={clearLogs}>clear</button>
      </div>
    </Modal>
  );
}

export function GameOverDialog({
  save,
  onClose,
  onHatch,
}: {
  save: UserSave;
  onClose: () => void;
  onHatch: () => void;
}) {
  const pet = save.current;
  if (!pet || pet.isAlive) return null;
  return (
    <Modal title="They died doing what they loved: routing" onClose={onClose}>
      <p className="epitaph">{pet.deathCause}</p>
      <p>{pet.epitaph}</p>
      <p className="hint">
        {pet.name} lasted {Math.floor(pet.lifespanSeconds)} real seconds, reached level {pet.maxLevelReached}, and processed{' '}
        {(pet.totalBytesRouted / 1e9).toFixed(2)} GB before the inevitable.
      </p>
      <button type="button" className="toy-btn warn" onClick={onHatch}>Hatch another victim</button>
    </Modal>
  );
}
