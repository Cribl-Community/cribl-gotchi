import { useEffect, useRef } from 'react';
import type { PetRun } from '../game/types.ts';
import { paintPet } from '../game/sprites.ts';

export function PetCanvas({ pet }: { pet: PetRun | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const petRef = useRef(pet);
  petRef.current = pet;

  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) paintPet(ctx, petRef.current, now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} width={128} height={128} className="lcd-canvas" aria-hidden="true" />;
}
