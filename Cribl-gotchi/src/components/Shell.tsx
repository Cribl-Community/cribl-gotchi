import { DIFFICULTIES, stageName } from '../game/catalog.ts';
import type { PetRun, UserSave } from '../game/types.ts';
import { PetCanvas } from './PetCanvas.tsx';

function Blocks({ label, value }: { label: string; value: number }) {
  const filled = Math.round(Math.max(0, Math.min(100, value)) / 10);
  return (
    <div className="stat">
      <span>{label}</span>
      <span className="blocks" aria-label={`${label} ${Math.round(value)} percent`}>
        {'█'.repeat(filled)}
        {'░'.repeat(10 - filled)}
      </span>
    </div>
  );
}

export function Shell({
  save,
  summary,
  onFeed,
  onPet,
  onClean,
  onSummon,
  onStorm,
  onFix,
  onPayJam,
  onOpen,
}: {
  save: UserSave | null;
  summary: string;
  onFeed: () => void;
  onPet: () => void;
  onClean: () => void;
  onSummon: () => void;
  onStorm: () => void;
  onFix: () => void;
  onPayJam: () => void;
  onOpen: (modal: 'hatch' | 'shop' | 'graves' | 'settings' | 'style' | 'logs') => void;
}) {
  const pet: PetRun | null = save?.current ?? null;
  const diff = pet ? DIFFICULTIES[pet.difficulty] : null;
  const hazard = pet?.activeHazard;
  const secondsLeft = hazard ? Math.max(0, Math.ceil((hazard.deadline - Date.now()) / 1000)) : 0;

  return (
    <div className="shell" aria-label="Cribl-gotchi handheld">
      <div className="shell-shine" />
      <div className="brand-row">
        <span className="screw" />
        <div>
          <p className="brand">CRIBL-GOTCHI</p>
          <p className="brand-sub">virtual pet for pipelines that have seen things</p>
        </div>
        <span className="screw" />
      </div>
      <div className={`lcd ${pet && pet.health < 30 ? 'alarm' : ''} ${hazard ? 'hazard' : ''}`}>
        <div className="lcd-top">
          <span>LVL {pet?.level ?? 0} {pet ? stageName(pet.evolutionStage) : 'EGG'}</span>
          <span>{diff ? diff.label.toUpperCase() : 'NO PET'}</span>
          <span>{Math.floor(pet?.byteCoins ?? 0)} $BC</span>
        </div>
        <PetCanvas pet={pet} />
        <p className="speech" aria-live="polite">
          {pet?.speech ?? 'An egg is judging you from inside the plastic.'}
        </p>
        {pet ? (
          <>
            <Blocks label="HP" value={pet.health} />
            <Blocks label="NOM" value={pet.hunger} />
            <Blocks label="JOY" value={pet.happiness} />
          </>
        ) : (
          <p className="speech">Hatch a mistake. Customize the size, the color, the unibrow.</p>
        )}
        {hazard && (
          <p className="hazard-line">
            {hazard.kind.toUpperCase()} {hazard.kind === 'jam' ? '' : `${secondsLeft}s`} — {hazard.detail}
          </p>
        )}
      </div>
      <div className="btn-row">
        <button type="button" className="toy-btn" onClick={onFeed}>Feed</button>
        <button type="button" className="toy-btn" onClick={onPet}>Pet</button>
        <button type="button" className="toy-btn" onClick={onClean}>Scoop</button>
      </div>
      <div className="btn-row small">
        <button type="button" className="toy-btn tiny" onClick={() => onOpen(pet ? 'style' : 'hatch')}>Style</button>
        <button type="button" className="toy-btn tiny" onClick={() => onOpen('shop')}>Shop</button>
        <button type="button" className="toy-btn tiny" onClick={() => onOpen('graves')}>Graves</button>
        <button type="button" className="toy-btn tiny" onClick={() => onOpen('settings')}>Knobs</button>
        <button type="button" className="toy-btn tiny" onClick={() => onOpen('logs')}>Logs</button>
      </div>
      <div className="btn-row">
        {hazard?.kind === 'regex' && (
          <button type="button" className="toy-btn warn" onClick={onFix}>Fix regex</button>
        )}
        {hazard?.kind === 'jam' && (
          <button type="button" className="toy-btn warn" onClick={onPayJam}>Pay the jam</button>
        )}
        <button type="button" className="toy-btn chaos" onClick={onSummon}>Summon gremlin</button>
        <button type="button" className="toy-btn chaos" onClick={onStorm}>Fake a storm</button>
        {(!pet || !pet.isAlive) && (
          <button type="button" className="toy-btn warn" onClick={() => onOpen('hatch')}>Hatch</button>
        )}
      </div>
      <p className="ticker">{summary}</p>
      <p className="serial">SN-GREMLIN-001 · not a medical device · do not feed credentials</p>
    </div>
  );
}
