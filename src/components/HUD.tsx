import { useGameStore } from '../state/gameStore'

export function HUD() {
  const snap = useGameStore()

  const sanityColor =
    snap.sanity > 60 ? '#45f2b0' : snap.sanity > 30 ? '#f0b849' : '#ef4444'

  const staminaColor = snap.exhausted ? '#ef4444' : snap.stamina > 35 ? '#7bdff2' : '#f0b849'

  const objectiveText =
    snap.relicsCollected < 5
      ? `Trouvez les 5 reliques du culte dans la brume (${snap.relicsCollected}/5)`
      : 'Atteignez le phare au nord et brisez le rituel [E]'

  const isPlaying = snap.phase === 'playing'
  const lowSanity = isPlaying && snap.sanity < 32
  const dangerFlash = isPlaying && snap.hitFlash > 0.04
  const pickupFlash = isPlaying && snap.pickupFlash > 0.04
  const hideHud = isPlaying && snap.settings.hideHud
  const moveKeysLabel = snap.settings.keyboardLayout === 'qwerty' ? 'W A S D' : 'Z Q S D'

  const trendText =
    snap.sanityTrend > 0.5
      ? `▲ +${Math.round(snap.sanityTrend)}/s`
      : snap.sanityTrend < -3.5
        ? `▼▼ ${snap.sanityTrend.toFixed(1)}/s`
        : snap.sanityTrend < -0.2
          ? `▼ ${snap.sanityTrend.toFixed(1)}/s`
          : '—'
  const trendColor =
    snap.sanityTrend > 0.5 ? '#6effcb' : snap.sanityTrend < -3.5 ? '#ff6b6b' : '#d8b46a'

  // Always-visible real FPS counter (persists across menu, pause, gameplay, and immersion mode)
  const fpsBadge = (
    <div style={styles.fpsBadge}>
      <span style={styles.label}>FPS</span>
      <span
        id="fps-counter"
        className="hud-mono"
        style={{ ...styles.value, color: snap.fps >= 45 ? '#7affc6' : snap.fps >= 28 ? '#f2c14e' : '#f87171' }}
      >
        {snap.fps} FPS
      </span>
    </div>
  )

  // On Menu / Pause / Lost / Won: show ONLY the real FPS counter (zero HUD clutter behind modals!)
  if (!isPlaying) {
    return (
      <div className="hud-root" style={styles.root}>
        <div style={styles.topRight}>{fpsBadge}</div>
      </div>
    )
  }

  // Immersion / Sans ATH mode: keep screen tension overlays + always-visible FPS + faint [H] hint
  if (hideHud) {
    return (
      <div className="hud-root" style={styles.root}>
        {dangerFlash && (
          <div style={{ ...styles.hitOverlay, opacity: Math.min(0.75, snap.hitFlash * 0.8) }} />
        )}
        {pickupFlash && (
          <div style={{ ...styles.pickupOverlay, opacity: Math.min(0.55, snap.pickupFlash * 0.6) }} />
        )}
        {lowSanity && <div className="danger-pulse" style={styles.madnessOverlay} />}
        <div style={styles.topRight}>{fpsBadge}</div>
        {snap.toastMessage && <div style={styles.toastBanner}>{snap.toastMessage}</div>}
        <div id="immersion-hint" style={styles.immersionHint}>
          Mode sans ATH · [H] Afficher l&apos;interface
        </div>
      </div>
    )
  }

  return (
    <div className="hud-root" style={styles.root}>
      {/* Screen-edge horror & pickup feedback overlays */}
      {dangerFlash && (
        <div style={{ ...styles.hitOverlay, opacity: Math.min(0.75, snap.hitFlash * 0.8) }} />
      )}
      {pickupFlash && (
        <div style={{ ...styles.pickupOverlay, opacity: Math.min(0.55, snap.pickupFlash * 0.6) }} />
      )}
      {lowSanity && <div className="danger-pulse" style={styles.madnessOverlay} />}

      {/* Top Center: Event Toast (clear of both topLeft sanity panel and center crosshair!) */}
      {snap.toastMessage && (
        <div style={styles.topCenter}>
          <div id="game-toast" style={styles.toastBanner}>
            {snap.toastMessage}
          </div>
        </div>
      )}

      {/* Subtle Pointer-Lock Hint above the bottom controls bar (zero overlap on 817px viewports) */}
      {!snap.pointerLocked && (
        <div style={styles.bottomHintWrap}>
          <div style={styles.lockHint}>
            Clic : verrouiller la souris · Glisser : regarder · [P] Pause
          </div>
        </div>
      )}

      {/* Top Left: Sanity + Trend + Stamina + Relics + Current Objective */}
      <div style={styles.topLeft}>
        <div style={styles.panel}>
          <div style={styles.rowBetween}>
            <span style={styles.label}>SANTÉ MENTALE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="hud-mono" style={{ fontSize: '11px', color: trendColor, fontWeight: 700 }}>
                {trendText}
              </span>
              <span className="hud-mono" style={{ ...styles.value, color: sanityColor }}>
                {snap.sanity} / 100
              </span>
            </div>
          </div>
          <div style={styles.barTrack}>
            <div
              style={{
                ...styles.barFill,
                width: `${snap.sanity}%`,
                background: sanityColor,
                boxShadow: `0 0 10px ${sanityColor}`,
              }}
            />
          </div>
          <div style={styles.subStatus}>
            {snap.isNearLight ? (
              <span style={{ color: '#8ef5c0' }}>● Zone éclairée (esprit apaisé)</span>
            ) : (
              <span style={{ color: '#9ab0aa' }}>○ Obscurité (l&apos;esprit s&apos;érode)</span>
            )}
          </div>

          {/* Stamina / Breath Bar */}
          <div style={{ ...styles.rowBetween, marginTop: '8px' }}>
            <span style={{ ...styles.label, fontSize: '10px' }}>
              {snap.exhausted ? 'ESSOUFFLÉ' : 'ENDURANCE [Maj]'}
            </span>
            <span className="hud-mono" style={{ fontSize: '11px', color: staminaColor }}>
              {snap.stamina}%
            </span>
          </div>
          <div style={{ ...styles.barTrack, height: '4px', marginTop: '4px' }}>
            <div
              style={{
                ...styles.barFill,
                width: `${snap.stamina}%`,
                background: staminaColor,
              }}
            />
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.rowBetween}>
            <span style={styles.label}>RELIQUES DU CULTE</span>
            <span className="hud-mono" style={{ ...styles.value, color: '#6effcb' }}>
              {snap.relicsCollected}/5
            </span>
          </div>
          <div style={styles.pipsRow}>
            {snap.collectedMask.map((found, i) => (
              <div
                key={i}
                style={{
                  ...styles.pip,
                  background: found ? '#48ffba' : 'rgba(255,255,255,0.08)',
                  borderColor: found ? '#8cffd3' : 'rgba(130,180,165,0.28)',
                  boxShadow: found ? '0 0 8px #48ffba' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div style={styles.objectivePanel}>
          <div style={styles.label}>OBJECTIF COURANT</div>
          <div style={styles.objectiveText}>{objectiveText}</div>
        </div>
      </div>

      {/* Top Right: Always-visible Real FPS + Flashlight + Audio + Threat Alert */}
      <div style={styles.topRight}>
        {fpsBadge}

        <div style={styles.compactPanel}>
          <span style={styles.label}>LAMPE [F]</span>
          <span
            className="hud-mono"
            style={{
              ...styles.value,
              color: snap.flashlightOn ? '#ffe394' : '#7b8b87',
            }}
          >
            {snap.flashlightOn ? 'ALLUMÉE' : 'ÉTEINTE'}
          </span>
        </div>

        <div style={styles.compactPanel}>
          <span style={styles.label}>AUDIO [M]</span>
          <span
            className="hud-mono"
            style={{
              ...styles.value,
              color: snap.muted ? '#7b8b87' : '#8ef5c0',
            }}
          >
            {snap.muted ? 'MUET' : 'ACTIF'}
          </span>
        </div>

        {snap.creatureState === 'chase' ? (
          <div style={styles.chaseAlert}>⚠ LA CHOSE VOUS POURSUIT</div>
        ) : snap.creatureDistance < 18 ? (
          <div style={styles.stalkAlert}>👁 PRÉSENCE PROCHE ({Math.round(snap.creatureDistance)}m)</div>
        ) : null}
      </div>

      {/* Clean Center Crosshair & Contextual [E] Interaction Prompt */}
      <div style={styles.centerZone}>
        <div style={styles.crosshair} />
        {snap.interactionPrompt && (
          <div id="interact-prompt" style={styles.interactPrompt}>
            {snap.interactionPrompt}
          </div>
        )}
      </div>

      {/* Single-Row Permanent On-Screen Controls Bar */}
      <div style={styles.controlsBar}>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>{moveKeysLabel}</kbd> Marcher
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>Souris</kbd> Regarder
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>Maj</kbd> Courir
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>E</kbd> Interagir
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>F</kbd> Lampe
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>P</kbd> Pause
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>H</kbd> ATH
        </span>
        <span style={styles.ctrlItem}>
          <kbd style={styles.kbd}>R</kbd> Rejouer
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '14px',
  },
  hitOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(circle, transparent 35%, rgba(168, 22, 34, 0.85) 100%)',
    pointerEvents: 'none',
  },
  pickupOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(circle, transparent 48%, rgba(56, 240, 175, 0.45) 100%)',
    pointerEvents: 'none',
  },
  madnessOverlay: {
    position: 'fixed',
    inset: 0,
    boxShadow: 'inset 0 0 110px rgba(34, 210, 140, 0.45)',
    pointerEvents: 'none',
  },
  topCenter: {
    position: 'fixed',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 44,
  },
  bottomHintWrap: {
    position: 'fixed',
    bottom: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 42,
  },
  topLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '290px',
  },
  topRight: {
    position: 'fixed',
    top: '14px',
    right: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '7px',
    zIndex: 45,
  },
  panel: {
    background: 'rgba(5, 13, 14, 0.76)',
    border: '1px solid rgba(110, 210, 175, 0.24)',
    borderRadius: '8px',
    padding: '9px 12px',
    backdropFilter: 'blur(6px)',
  },
  objectivePanel: {
    background: 'rgba(5, 13, 14, 0.76)',
    border: '1px solid rgba(110, 210, 175, 0.24)',
    borderRadius: '8px',
    padding: '8px 12px',
    backdropFilter: 'blur(6px)',
  },
  fpsBadge: {
    background: 'rgba(5, 13, 14, 0.82)',
    border: '1px solid rgba(110, 210, 175, 0.3)',
    borderRadius: '8px',
    padding: '6px 11px',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    backdropFilter: 'blur(6px)',
  },
  compactPanel: {
    background: 'rgba(5, 13, 14, 0.76)',
    border: '1px solid rgba(110, 210, 175, 0.24)',
    borderRadius: '8px',
    padding: '6px 11px',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    backdropFilter: 'blur(6px)',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '10.5px',
    letterSpacing: '0.1em',
    color: '#8ba89f',
    fontWeight: 700,
  },
  value: {
    fontSize: '13.5px',
    fontWeight: 700,
  },
  barTrack: {
    width: '100%',
    height: '7px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '999px',
    overflow: 'hidden',
    marginTop: '6px',
  },
  barFill: {
    height: '100%',
    transition: 'width 120ms linear, background-color 200ms ease',
  },
  subStatus: {
    fontSize: '11px',
    marginTop: '5px',
  },
  pipsRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
  },
  pip: {
    flex: 1,
    height: '7px',
    borderRadius: '3px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  objectiveText: {
    marginTop: '4px',
    fontSize: '12.5px',
    lineHeight: 1.35,
    color: '#e0efe8',
  },
  chaseAlert: {
    background: 'rgba(135, 18, 28, 0.88)',
    border: '1px solid rgba(255, 110, 110, 0.65)',
    color: '#ffd8d8',
    fontSize: '11.5px',
    fontWeight: 700,
    letterSpacing: '0.07em',
    padding: '6px 10px',
    borderRadius: '6px',
  },
  stalkAlert: {
    background: 'rgba(42, 34, 14, 0.85)',
    border: '1px solid rgba(235, 195, 90, 0.5)',
    color: '#f5df9c',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    padding: '6px 10px',
    borderRadius: '6px',
  },
  centerZone: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  crosshair: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(180, 255, 224, 0.88)',
    boxShadow: '0 0 6px rgba(100, 255, 190, 0.85)',
  },
  interactPrompt: {
    background: 'rgba(5, 18, 18, 0.9)',
    border: '1px solid rgba(100, 255, 190, 0.52)',
    color: '#defff2',
    padding: '8px 15px',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
  },
  lockHint: {
    background: 'rgba(5, 14, 15, 0.74)',
    border: '1px solid rgba(160, 220, 195, 0.25)',
    color: '#b4d0c5',
    padding: '5px 12px',
    borderRadius: '999px',
    fontSize: '11.5px',
    whiteSpace: 'nowrap',
  },
  toastBanner: {
    background: 'rgba(8, 28, 24, 0.92)',
    border: '1px solid rgba(100, 255, 190, 0.55)',
    color: '#d8fff0',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
    whiteSpace: 'nowrap',
  },
  controlsBar: {
    alignSelf: 'center',
    background: 'rgba(5, 12, 13, 0.78)',
    border: '1px solid rgba(110, 210, 175, 0.22)',
    borderRadius: '8px',
    padding: '6px 12px',
    display: 'flex',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '11px',
    color: '#c7dbd4',
    backdropFilter: 'blur(6px)',
    maxWidth: '96vw',
    overflow: 'hidden',
  },
  ctrlItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  kbd: {
    background: 'rgba(120, 220, 180, 0.14)',
    border: '1px solid rgba(120, 220, 180, 0.35)',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '10.5px',
    fontFamily: 'SF Mono, Menlo, monospace',
    color: '#8cffd3',
  },
  immersionHint: {
    position: 'fixed',
    bottom: '12px',
    right: '14px',
    fontSize: '11px',
    color: 'rgba(165, 215, 195, 0.45)',
    letterSpacing: '0.06em',
    pointerEvents: 'none',
  },
}
