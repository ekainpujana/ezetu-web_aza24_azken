import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type KeyboardEvent } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { LangCode, Spot } from '@/lib/types';
import { useApp } from '@/lib/app-context';
import { loadGeoAtlas, territoryIdsForSpot, type GeoAtlas } from '@/lib/geo-atlas';
import {
  IDENTITY_VIEWPORT, panBy, zoomAt, type Viewport, type ViewBox,
} from '@/lib/map-viewport';
import { countryName, COUNTRY_NAMES } from '@/lib/utils';
import { FlagIcon } from './FlagIcon';
import { Plus, Minus, RotateCcw, Trophy, ArrowRight } from 'lucide-react';

interface Selection {
  kind: 'country' | 'entity';
  key: string;
  title: string;
}

interface Props {
  spots: Spot[];
  lang: string;
}

const VIEW: ViewBox = { width: 960, height: 480 };
const TAP_TOLERANCE = 4;
const EUSKAL_HERRIA = COUNTRY_NAMES.eu.EH;

const VISITED_LABEL: Record<string, string> = {
  eu: '✓ Esploratua',
  es: '✓ Conquistado',
  en: '✓ Explored',
  fr: '✓ Exploré',
  pt: '✓ Explorado',
  it: '✓ Esplorato',
  de: '✓ Erkundet',
};

const HINT_LABEL: Record<string, string> = {
  eu: 'Sakatu herrialde bat izena ikusteko',
  es: 'Toca un país para ver su nombre',
  en: 'Tap a country to see its name',
  fr: 'Touchez un pays pour voir son nom',
  pt: 'Toca num país para ver o nome',
  it: 'Tocca un paese per vedere il nome',
  de: 'Tippe auf ein Land, um den Namen zu sehen',
};

const GO_TO_RANKING_LABEL: Record<string, string> = {
  eu: 'Ikusi sailkapenean',
  es: 'Ver en ranking',
  en: 'View in ranking',
  fr: 'Voir dans le classement',
  pt: 'Ver no ranking',
  it: 'Vedi nella classifica',
  de: 'In der Rangliste ansehen',
};

interface PointerState {
  points: Map<number, { x: number; y: number }>;
  startPos: { x: number; y: number } | null;
  pinchDistance: number;
  moved: boolean;
}

export function WorldMap({ spots, lang }: Props) {
  const { navigateToRankings } = useApp();

  const normLang = (lang || '').toLowerCase() === 'eus' || (lang || '').toLowerCase() === 'eu' ? 'eu' : (lang || 'es').toLowerCase().slice(0, 2);
  const isEus = normLang === 'eu';

  const [atlas, setAtlas] = useState<GeoAtlas | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [animate, setAnimate] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<PointerState>({ points: new Map(), startPos: null, pinchDistance: 0, moved: false });

  useEffect(() => {
    let cancelled = false;
    loadGeoAtlas()
      .then((loaded) => { if (!cancelled) setAtlas(loaded); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const visitedIsos = useMemo(() => new Set(spots.map((s) => s.country_code)), [spots]);
  const entityVisited = useMemo(() => spots.some((s) => territoryIdsForSpot(s).length > 0), [spots]);

  const projection = useMemo(() => {
    if (!atlas) return null;
    return geoNaturalEarth1().fitExtent([[8, 8], [VIEW.width - 8, VIEW.height - 8]], atlas.countries);
  }, [atlas]);

  if (loadFailed) {
    return (
      <p className="py-16 text-center text-sm text-terracotta-600 dark:text-terracotta-300">
        {isEus ? 'Ezin izan da mapa kargatu.' : 'No se pudo cargar el mapa.'}
      </p>
    );
  }
  if (!atlas || !projection) {
    return (
      <div className="grid place-items-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-forest-300 border-t-forest-600 animate-spin" />
      </div>
    );
  }

  const toView = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.width,
      y: ((clientY - rect.top) / rect.height) * VIEW.height,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const state = pointerRef.current;
    const pos = toView(e.clientX, e.clientY);
    state.points.set(e.pointerId, pos);
    if (state.points.size === 1) {
      state.startPos = pos;
      state.moved = false;
    }
    if (state.points.size === 2) {
      const [a, b] = [...state.points.values()];
      state.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      state.moved = true;
    }
    setAnimate(false);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const state = pointerRef.current;
    const prev = state.points.get(e.pointerId);
    if (!prev) return;
    const cur = toView(e.clientX, e.clientY);
    state.points.set(e.pointerId, cur);

    if (state.points.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;

      if (!state.moved && state.startPos) {
        const dist = Math.hypot(cur.x - state.startPos.x, cur.y - state.startPos.y);
        if (dist > TAP_TOLERANCE) {
          state.moved = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          setSelection(null);
        }
      }

      if (state.moved) {
        setViewport((v) => panBy(v, dx, dy, VIEW));
      }
    } else if (state.points.size === 2) {
      const [a, b] = [...state.points.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = state.pinchDistance > 0 ? distance / state.pinchDistance : 1;
      state.pinchDistance = distance;
      setViewport((v) => zoomAt(v, ratio, (a.x + b.x) / 2, (a.y + b.y) / 2, VIEW));
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<SVGSVGElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    pointerRef.current.points.delete(e.pointerId);
    if (pointerRef.current.points.size === 0) {
      pointerRef.current.startPos = null;
    }
  };

  const onDoubleClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const point = toView(e.clientX, e.clientY);
    setAnimate(true);
    setViewport((v) => zoomAt(v, 2, point.x, point.y, VIEW));
  };

  const zoomBy = (factor: number) => {
    setAnimate(true);
    setViewport((v) => zoomAt(v, factor, VIEW.width / 2, VIEW.height / 2, VIEW));
  };

  const resetView = () => {
    setAnimate(true);
    setViewport(IDENTITY_VIEWPORT);
  };

  const pathFor = geoPath(projection);
  const selectionVisited = selection?.kind === 'entity'
    ? entityVisited
    : selection ? visitedIsos.has(selection.key) : false;

  const choose = (selected: Selection) => {
    if (pointerRef.current.moved) return;
    setSelection({ ...selected });
  };

  const interactive = (selected: Selection) => ({
    onClick: (e: ReactMouseEvent) => {
      e.stopPropagation();
      choose(selected);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') choose(selected);
    },
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': selected.title,
  });

  const handleGoToRanking = () => {
    if (!selection) return;
    const countryCode = selection.kind === 'entity' ? 'EUS' : selection.key.toUpperCase();
    navigateToRankings({
      continent: 'all',
      country: countryCode,
      province: 'all',
    });
  };

  const controlClass = 'w-9 h-9 grid place-items-center rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 shadow-soft hover:bg-white dark:hover:bg-slate-700 transition-colors';

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950 border border-forest-100 dark:border-slate-800">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          className="world-map w-full h-auto select-none touch-none cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Mapa del mundo"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
          onDoubleClick={onDoubleClick}
        >
          <g
            className={animate ? 'passport-zoom-anim' : undefined}
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.k})`, transformOrigin: '0 0' }}
          >
            {atlas.countries.features.map((f, i) => {
              const iso = f.properties.iso ?? `c${i}`;
              const visited = visitedIsos.has(iso);
              const name = countryName(iso, lang as LangCode, f.properties.name);
              return (
                <path
                  key={`c-${iso}-${i}`}
                  d={pathFor(f) ?? ''}
                  className={`passport-area cursor-pointer transition-colors ${visited ? 'passport-visited' : ''}`}
                  {...interactive({ kind: 'country', key: iso, title: name })}
                >
                  <title>{name}</title>
                </path>
              );
            })}

            {isEus && atlas.euskalHerria.features.map((f, i) => (
              <path
                key={`eh-${i}`}
                d={pathFor(f) ?? ''}
                className={`passport-entity cursor-pointer transition-colors ${entityVisited ? 'passport-visited' : ''}`}
                {...interactive({ kind: 'entity', key: 'euskal-herria', title: EUSKAL_HERRIA })}
              >
                <title>{EUSKAL_HERRIA}</title>
              </path>
            ))}
          </g>
        </svg>

        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
          <button type="button" aria-label="Zoom in" className={controlClass} onClick={() => zoomBy(1.5)}><Plus className="w-4 h-4" /></button>
          <button type="button" aria-label="Zoom out" className={controlClass} onClick={() => zoomBy(1 / 1.5)}><Minus className="w-4 h-4" /></button>
          <button type="button" aria-label="Reset" className={controlClass} onClick={resetView}><RotateCcw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Info del país y enlace directo a su Ranking */}
      <div className="mt-3 min-h-[38px] flex items-center justify-center px-2">
        {selection ? (
          <div
            key={`${selection.kind}-${selection.key}`}
            className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/95 dark:bg-slate-850/95 backdrop-blur-md px-3.5 py-2 text-xs sm:text-sm text-white shadow-soft animate-popIn"
          >
            {/* Bandera oficial o Ikurriña */}
            <FlagIcon
              code={selection.key}
              isEH={selection.kind === 'entity'}
              className="w-5 h-3.5 rounded-[2px] shrink-0 shadow-sm"
            />

            <span className="font-semibold text-sand-100">{selection.title}</span>

            {selectionVisited && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                {VISITED_LABEL[normLang] ?? VISITED_LABEL.es}
              </span>
            )}

            <span className="text-slate-600 dark:text-slate-500 select-none hidden sm:inline">|</span>

            {/* Botón que navega a Rankings aplicando el filtro del país */}
            <button
              type="button"
              onClick={handleGoToRanking}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-terracotta-500/20 hover:bg-terracotta-500 border border-terracotta-400/30 hover:border-terracotta-400 text-terracotta-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-400 group-hover:text-white transition-colors" />
              <span>{GO_TO_RANKING_LABEL[normLang] ?? GO_TO_RANKING_LABEL.es}</span>
              <ArrowRight className="w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 text-center">
            {HINT_LABEL[normLang] ?? HINT_LABEL.es}
          </span>
        )}
      </div>
    </div>
  );
}