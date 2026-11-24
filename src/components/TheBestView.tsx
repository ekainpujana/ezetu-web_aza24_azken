import { useEffect, useMemo, useState } from 'react';
import { Heart, MapPin, ChevronLeft, ChevronRight, Medal, Trophy, Camera, CalendarDays, Globe } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { TrophyAwardsNavIcon } from './NavIcons';
import { fetchPhotoAwards } from '@/lib/data';
import { formatLikes, basqueName } from '@/lib/utils';
import {
  AWARDS_LAUNCH_YEAR, AWARDS_REFERENCE_DATE, awardBadge, awardPeriodText,
  awardsForPeriod, defaultPeriodStart, lastClosedMonthStart, lastClosedYearStart, periodStartKey,
} from '@/lib/awards';
import { Ikurrina } from './Ikurrina';
import { ProtectedPhoto } from './ProtectedPhoto';
import { PlaceBreadcrumb } from './PlaceBreadcrumb';
import type { AwardPeriod, LangCode, PhotoAward, Spot } from '@/lib/types';

interface PodiumCardProps {
  award: PhotoAward;
  lang: LangCode;
  onOpenPhoto: (award: PhotoAward) => void;
  onOpenPlace: (spot: Spot) => void;
  onOpenPhotographer: (author: string) => void;
}

function MedalBadge({ rank }: { rank: number }) {
  const colorCls =
    rank === 1
      ? 'text-[#D97706] dark:text-amber-500'
      : rank === 2
        ? 'text-[#64748B] dark:text-slate-300'
        : 'text-[#B45309] dark:text-orange-600';

  const numStrokeCls = rank === 2 ? 'stroke-white dark:stroke-slate-900' : 'stroke-white';

  const numPath =
    rank === 1
      ? 'M10.8 11.7 12 10.7v5.6M10.5 16.3h3'
      : rank === 2
        ? 'M10.3 12.2c0-1.1.8-1.6 1.7-1.6s1.7.5 1.7 1.4c0 1.3-3.4 2.3-3.4 4.2h3.4'
        : 'M10.5 11.4c.4-.6 1-.9 1.6-.9 1 0 1.6.6 1.6 1.4 0 .8-.6 1.4-1.6 1.4h-.5m.5 0c1.1 0 1.7.6 1.7 1.5 0 .9-.7 1.5-1.8 1.5-.7 0-1.3-.3-1.6-.9';

  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 ${colorCls}`} aria-hidden="true">
      <path d="M8.5 2.5h7l-1.2 2.3H9.7L8.5 2.5Z" fill="#0284C7" />
      <path d="M12 5.5 18.9 9.5v8L12 21.5l-6.9-4v-8L12 5.5Z" fill="currentColor" />
      <path d={numPath} className={numStrokeCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PodiumCard({ award, lang, onOpenPhoto, onOpenPlace, onOpenPhotographer }: PodiumCardProps) {
  const { photo, rank } = award;
  const spot = photo.spot;
  const isEus = lang === 'EUS' && spot?.euskal_herria;
  const ringColor = rank === 1 ? 'ring-amber-400' : rank === 2 ? 'ring-slate-300' : 'ring-orange-400';
  const glow = rank === 1 ? 'shadow-[0_0_28px_rgba(245,158,11,0.45)]' : rank === 2 ? 'shadow-[0_0_18px_rgba(203,213,225,0.4)]' : 'shadow-[0_0_18px_rgba(251,146,60,0.4)]';
 const sizeClass = rank === 1 ? 'sm:scale-105 md:scale-110 sm:-translate-y-2' : '';
  const cardSize = rank === 1 ? 'h-72 sm:h-80' : 'h-60 sm:h-64';

  return (
    <div className={`relative rounded-3xl overflow-hidden ring-4 ${ringColor} ${glow} ${sizeClass} bg-forest-50 dark:bg-slate2-850 transition-transform`}>
      <div className={`relative ${cardSize}`}>
        <button
          type="button"
          onClick={() => onOpenPhoto(award)}
          aria-label={spot?.name ?? 'Photo'}
          className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden group"
        >
          <ProtectedPhoto src={photo.image_url} alt={spot?.name ?? 'Photo'} className="object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10 pointer-events-none" />
        </button>
      </div>
      <div className="absolute top-3 left-3 grid place-items-center w-10 h-10 rounded-full bg-white/90 dark:bg-slate2-900/90 backdrop-blur shadow-soft pointer-events-none">
        <MedalBadge rank={rank} />
      </div>
     <div className="absolute bottom-0 inset-x-0 p-4 text-white pointer-events-none">
        {spot && (
          <button onClick={() => onOpenPlace(spot)} className="block text-left w-full pointer-events-auto">
            <div className="flex items-center gap-1.5 text-sm font-700">
              <MapPin className="w-3.5 h-3.5 text-terracotta-300 shrink-0" />
              <span className="truncate">{isEus ? basqueName(spot.id, spot.name) : spot.name}</span>
              {isEus && <Ikurrina className="w-3.5 h-2.5 shrink-0" />}
            </div>
          </button>
        )}
        {spot && <PlaceBreadcrumb spot={spot} tone="onDark" className="mt-1 -ml-2 pointer-events-auto" />}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => onOpenPhotographer(photo.author)}
            className="pointer-events-auto flex items-center gap-1 text-[11px] font-600 hover:text-terracotta-300 transition-colors"
          >
            <Camera className="w-3 h-3" />
            @{photo.author}
          </button>
          <span className="flex items-center gap-1 text-xs font-700">
            <Heart className="w-3 h-3 fill-terracotta-400 text-terracotta-400" />
            {formatLikes(photo.likes)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TheBestView() {
  const { t, lang, setTab, setFocusedSpotId, setPhotographerOpen, openLightbox, closeLightbox } = useApp();
  const [period, setPeriod] = useState<AwardPeriod>('month');
  const [selectedStart, setSelectedStart] = useState<Date>(() => lastClosedMonthStart(AWARDS_REFERENCE_DATE));
  const [awards, setAwards] = useState<PhotoAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchPhotoAwards();
        if (!alive) return;
        setAwards(list);
        setSelectedStart(defaultPeriodStart(list, 'month', AWARDS_REFERENCE_DATE));
      }
      catch { if (alive) setAwards([]); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const lastClosedStart = period === 'month' ? lastClosedMonthStart(AWARDS_REFERENCE_DATE) : lastClosedYearStart(AWARDS_REFERENCE_DATE);
  const firstStart = new Date(AWARDS_LAUNCH_YEAR, 0, 1);
  const canGoPrev = selectedStart > firstStart;
  const canGoNext = selectedStart < lastClosedStart;

  const switchPeriod = (next: AwardPeriod) => {
    setPeriod(next);
    setSelectedStart(defaultPeriodStart(awards, next, AWARDS_REFERENCE_DATE));
  };

  const step = (dir: 1 | -1) => {
    const y = selectedStart.getFullYear();
    const m = selectedStart.getMonth();
    setSelectedStart(period === 'month' ? new Date(y, m + dir, 1) : new Date(y + dir, 0, 1));
  };

  const periodKey = periodStartKey(selectedStart);
  const currentLabel = awardPeriodText(period, periodKey, lang);

  const podium = useMemo(() => awardsForPeriod(awards, period, selectedStart), [awards, period, selectedStart]);
  const podiumByRank = (rank: 1 | 2 | 3) => podium.find((a) => a.rank === rank);

  const handleViewSpot = (s: Spot) => {
    closeLightbox();
    setFocusedSpotId(s.id);
    setTab('map');
  };

  const openPodiumPhoto = (award: PhotoAward) => {
    const spot = award.photo.spot ?? null;
    openLightbox([award.photo], spot, 0, {
      photoSpots: spot ? { [award.photo.id]: spot } : undefined,
      onViewSpot: handleViewSpot,
      awardLabels: { [award.photo.id]: awardBadge(award, lang) },
    });
  };

  const periodTabs: { id: AwardPeriod; label: string; icon: typeof CalendarDays }[] = [
    { id: 'month', label: t('periodMonth'), icon: CalendarDays },
    { id: 'year', label: t('periodYear'), icon: Globe },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mt-1 mb-3 flex justify-center animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-700 uppercase tracking-wider">
          <TrophyAwardsNavIcon className="w-4 h-4 shrink-0" />
          {t('hallOfFame')}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mb-7 sm:mb-9">
        <div className="flex gap-0.5 p-1 rounded-full bg-forest-50 dark:bg-slate2-900/60 border border-forest-100 dark:border-slate2-800">
          {periodTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchPeriod(id)}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-600 whitespace-nowrap transition-all ${
                period === id
                  ? 'bg-white dark:bg-slate2-800 text-forest-800 dark:text-sand-100 shadow-soft'
                  : 'text-forest-700/70 dark:text-sand-300/70 hover:text-forest-800 dark:hover:text-sand-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate2-900 border border-forest-100 dark:border-slate2-800 shadow-soft">
          <button
            onClick={() => step(-1)}
            disabled={!canGoPrev}
            aria-label={t('previous')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-600 transition-all ${
              canGoPrev
                ? 'text-forest-700 dark:text-sand-200 hover:bg-forest-50 dark:hover:bg-slate2-800'
                : 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('previous')}</span>
          </button>

          <span className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-700 text-forest-800 dark:text-sand-100 min-w-[130px] sm:min-w-[165px] justify-center capitalize">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            {currentLabel}
          </span>

          <button
            onClick={() => step(1)}
            disabled={!canGoNext}
            aria-label={t('next')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-600 transition-all ${
              canGoNext
                ? 'text-forest-700 dark:text-sand-200 hover:bg-forest-50 dark:hover:bg-slate2-800'
                : 'text-forest-300 dark:text-slate2-700 cursor-not-allowed'
            }`}
          >
            <span className="hidden sm:inline">{t('next')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

     {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-sm sm:max-w-3xl mx-auto items-end">
          {[1, 2, 3].map((r) => (
            <div key={r} className={`rounded-3xl shimmer-bg animate-shimmer bg-forest-100/40 dark:bg-slate2-800/40 ${r === 1 ? 'h-72 sm:h-80' : 'h-60 sm:h-64'}`} />
          ))}
        </div>
      ) : podium.length === 0 ? (
        <div className="py-20 text-center text-forest-700/50 dark:text-sand-300/50 animate-fadeIn">
          <Medal className="w-10 h-10 mx-auto mb-3 text-forest-300 dark:text-slate2-700" />
          <p className="text-sm">{t('noAwardedPhotos')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-sm sm:max-w-3xl mx-auto items-end animate-fadeIn">
          {([[2, 'order-2 sm:order-1'], [1, 'order-1 sm:order-2'], [3, 'order-3']] as const).map(([rank, orderClass]) => {
            const award = podiumByRank(rank);
            return (
              <div key={rank} className={orderClass}>
                {award && (
                  <PodiumCard
                    award={award}
                    lang={lang}
                    onOpenPhoto={openPodiumPhoto}
                    onOpenPlace={(spot) => { setFocusedSpotId(spot.id); setTab('map'); }}
                    onOpenPhotographer={(author) => setPhotographerOpen(author)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
