import {
  Award,
  Bot,
  CheckCircle2,
  Cpu,
  DollarSign,
  GraduationCap,
} from 'lucide-react'
import { CERTIFICATION_TRACKS, type CertificationTrack } from '../types'
import { useStudyApp } from '../hooks/useStudyApp'

const TRACK_ICONS: Record<CertificationTrack, typeof GraduationCap> = {
  CTFL: GraduationCap,
  'CTAL-TAE': Cpu,
  'CT-FT': DollarSign,
  'CT-AI': Bot,
}

export interface TrackSelectorProps {
  compact?: boolean
  showDescription?: boolean
  className?: string
}

export function TrackSelector({
  compact = false,
  showDescription = true,
  className = '',
}: TrackSelectorProps) {
  const { activeTrack, setActiveTrack, allQuestions } = useStudyApp()

  return (
    <div className={`track-selector-container ${className}`}>
      <div className="track-selector-header">
        <div className="track-selector-title">
          <Award size={18} className="track-selector-title__icon" />
          <span>Trilha de Certificação Ativa:</span>
        </div>
        <span className="track-selector-badge-current">
          {CERTIFICATION_TRACKS.find((t) => t.id === activeTrack)?.shortTitle}
        </span>
      </div>

      <div className={`track-selector-grid ${compact ? 'track-selector-grid--compact' : ''}`}>
        {CERTIFICATION_TRACKS.map((track) => {
          const isSelected = activeTrack === track.id
          const Icon = TRACK_ICONS[track.id]
          const trackQuestionCount = allQuestions.filter(
            (q) => (q.track ?? 'CTFL') === track.id,
          ).length

          return (
            <button
              key={track.id}
              type="button"
              className={`track-card ${isSelected ? 'track-card--active' : ''}`}
              onClick={() => setActiveTrack(track.id)}
              aria-pressed={isSelected}
              style={{
                borderColor: isSelected ? track.accentColor : undefined,
                boxShadow: isSelected ? `0 0 0 1px ${track.accentColor}` : undefined,
              }}
            >
              <div className="track-card__top">
                <span
                  className="track-card__icon"
                  style={{
                    backgroundColor: isSelected ? `${track.accentColor}22` : undefined,
                    color: track.accentColor,
                  }}
                >
                  <Icon size={20} />
                </span>
                <span className="track-card__code">{track.code}</span>
                {isSelected && (
                  <span className="track-card__check" style={{ color: track.accentColor }}>
                    <CheckCircle2 size={16} />
                  </span>
                )}
              </div>

              <div className="track-card__content">
                <strong className="track-card__title">{track.shortTitle}</strong>
                {showDescription && !compact && (
                  <p className="track-card__description">{track.subtitle}</p>
                )}
                <div className="track-card__meta">
                  <span>{trackQuestionCount} questões</span>
                  <span>·</span>
                  <span>{track.durationMinutes} min</span>
                  <span>·</span>
                  <span>{track.passingPercentage}% aprovação</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
