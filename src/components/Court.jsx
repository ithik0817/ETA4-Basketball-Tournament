// src/components/Court.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import courtImage from "../images/FIBA_Court.svg";

export default function Court({
  onAddShot,
  selectedPlayerId,
  selectedTeamId,
  onUndo,
  shots,
  quarter,
  activeHomePlayers,
  activeAwayPlayers,
  homeTeamId,
  awayTeamId,
  flipCourt,
  homeTeamName,
  awayTeamName,
}) {

  const svgRef = useRef(null);
  const [debug, setDebug] = useState(false);
  const [pendingShot, setPendingShot] = useState(null);
  const [popupStep, setPopupStep] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);

  const COURT_WIDTH_FT = 91.9;
  const COURT_HEIGHT_FT = 49.2;
  const THREE_RADIUS_FT = 22.14567;
  const RIM_OFFSET_FT = 5.1673228;
  const RIM_Y_FT = COURT_HEIGHT_FT / 2.005;
  const CORNER_THREE_RECT_WIDTH_FT = 10;
  const CORNER_THREE_RECT_HEIGHT_FT = 3.175;

  const COURT_WIDTH_PX = 797.19;
  const COURT_HEIGHT_PX = 427.98;

  const scaleX = COURT_WIDTH_PX / COURT_WIDTH_FT;
  const scaleY = COURT_HEIGHT_PX / COURT_HEIGHT_FT;

  const TopX = 0;
  const TopY = 0;
  const BottomY = COURT_HEIGHT_FT - CORNER_THREE_RECT_HEIGHT_FT;
  const RightX = COURT_WIDTH_FT - CORNER_THREE_RECT_WIDTH_FT;
  const rectWidthPx = ftToPxX(CORNER_THREE_RECT_WIDTH_FT);
  const rectHeightPx = ftToPxY(CORNER_THREE_RECT_HEIGHT_FT);
  const BottomYPx = ftToPxY(BottomY);
  const RightXPx = ftToPxX(RightX);

  // keep reference to visible players during popup
  const [popupPlayers, setPopupPlayers] = useState([]);

  // handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (popupStep !== "player") return;

    // only support 1–9 for now
    if (e.code.startsWith("Digit")) {
      const idx = parseInt(e.key, 10) - 1; // 1→0 index
      if (!isNaN(idx) && idx >= 0 && idx < popupPlayers.length) {
        const p = popupPlayers[idx];
        if (p) {
          setPendingShot({
            ...pendingShot,
            playerId: p.id,
            teamId: p.teamId,
          });
          setPopupStep("result");
        }
      }
    }
  }, [popupStep, popupPlayers, pendingShot]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const rimLeftPx = {
    x: ftToPxX(RIM_OFFSET_FT),
    y: ftToPxY(RIM_Y_FT)
  };
  const rimRightPx = {
    x: ftToPxX(COURT_WIDTH_FT - RIM_OFFSET_FT),
    y: ftToPxY(RIM_Y_FT),
  };

  function ftToPxX(ftX) { return ftX * scaleX; }
  function ftToPxY(ftY) { return ftY * scaleY; }
  function pxToFtX(pxX) { return pxX / scaleX; }
  function pxToFtY(pxY) { return pxY / scaleY; }

  function toSVGPoint(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    const inv = ctm.inverse();
    const svgP = pt.matrixTransform(inv);

    return { x: svgP.x, y: svgP.y };
  }

  function handlePointerDown(e) {
    const svgP = toSVGPoint(e.clientX, e.clientY);
    if (!svgP) return;

    const ftX = pxToFtX(svgP.x);
    const ftY = pxToFtY(svgP.y);

    let courtSide;
    if (!flipCourt) {
      courtSide = ftX < COURT_WIDTH_FT / 2 ? "home" : "away";
    } else {
      courtSide = ftX < COURT_WIDTH_FT / 2 ? "away" : "home";
    }

    console.log("flipCourt:", flipCourt);
    console.log("ftX:", ftX);
    console.log("Court Side determined:", courtSide);

    setPendingShot({
      x: e.clientX,
      y: e.clientY,
      ftX,
      ftY,
      courtSide,
      flipCourt,
      isFreeThrow: false
      });

    setPopupStep("player");
  }

  function computeIsThree(ftX, ftY, courtSide, flipCourt) {
    let rimX;
    const rimY = RIM_Y_FT;

    if (!flipCourt) {
        rimX = courtSide === "home" ? RIM_OFFSET_FT : COURT_WIDTH_FT - RIM_OFFSET_FT;
    } else {
        rimX = courtSide === "home" ? COURT_WIDTH_FT - RIM_OFFSET_FT : RIM_OFFSET_FT;
    }

    const dx = ftX - rimX;
    const dy = ftY - rimY;
    const distFt = Math.hypot(dx, dy);

    const inLeftTopCorner =
      ftX >= TopX &&
      ftX <= (TopX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= TopY &&
      ftY <= (TopY + CORNER_THREE_RECT_HEIGHT_FT);
    const inLeftBottomCorner =
      ftX >= TopX &&
      ftX <= (TopX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= BottomY &&
      ftY <= (BottomY + CORNER_THREE_RECT_HEIGHT_FT);
    const inRightTopCorner =
      ftX >= RightX &&
      ftX <= (RightX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= TopY &&
      ftY <= (TopY + CORNER_THREE_RECT_HEIGHT_FT);
    const inRightBottomCorner =
      ftX >= RightX &&
      ftX <= (RightX + CORNER_THREE_RECT_WIDTH_FT) &&
      ftY >= BottomY &&
      ftY <= (BottomY + CORNER_THREE_RECT_HEIGHT_FT);

    const inCorner3 = inLeftTopCorner || inLeftBottomCorner || inRightTopCorner || inRightBottomCorner;
    const behindArc = distFt > THREE_RADIUS_FT;
    const is3 = inCorner3 || behindArc;
    return { is3, distFt, inCorner3, behindArc };
  }

  function finalizeShot(madeOrShot = null, assistPlayerId = null) {
    let src;
    let made = null;

    if (madeOrShot && typeof madeOrShot === "object") {
      src = madeOrShot;
    } else {
      made = madeOrShot;
      src = pendingShot;
    }

    if (!src) {
      console.warn("finalizeShot called with no pendingShot/event object");
      return;
    }

    const {
      ftX,
      ftY,
      playerId,
      teamId,
      courtSide,
      flipCourt,
      isFreeThrow,
      isBeyondHalfCourt,
      isRebound,
      isTurnover,
    } = src;

    if (!playerId) {
      console.error("finalizeShot: missing playerId — aborting", src);
      setPendingShot(null);
      setPopupStep(null);
      return;
    }

    let newEvent;

    if (isFreeThrow) {
      newEvent = {
        id: Date.now().toString(),
        type: "freeThrow",
        playerId,
        teamId,
        isFreeThrow: true,
        made: !!made, // ensure boolean
        points: 1,
        distFt: 15,
        quarter,
        flipCourt,
      };
    } else if (isRebound) {
      newEvent = {
        id: Date.now().toString(),
        type: "offRebound",
        playerId,
        teamId,
        quarter,
        flipCourt,
      };
    } else if (isTurnover) {
      newEvent = {
        id: Date.now().toString(),
        type: "turnover",
        playerId,
        teamId,
        quarter,
        flipCourt,
      };
    } else if (isBeyondHalfCourt) {
      newEvent = {
        id: Date.now().toString(),
        type: "shot",
        playerId,
        teamId,
        isFreeThrow: false,
        isBeyondHalfCourt: true,
        ftX,
        ftY,
        is3: true,
        distFt: 50,
        made: !!made,
        points: 3,
        quarter,
        assistPlayerId,
        flipCourt,
      };
    } else {
      const { is3, distFt, inCorner3, behindArc } = computeIsThree(ftX, ftY, courtSide, flipCourt);
      const points = is3 ? 3 : 2;

      newEvent = {
        id: Date.now().toString(),
        type: "shot",
        playerId,
        teamId,
        isFreeThrow: false,
        ftX,
        ftY,
        is3,
        distFt,
        courtSide,
        flipCourt,
        inCorner3,
        behindArc,
        made: !!made,
        points,
        quarter,
        assistPlayerId,
      };
    }

    onAddShot(newEvent);
    setPendingShot(null);
    setPopupStep(null);
    console.log("newEvent", newEvent);
  }

  function getTargetRimByTeam(teamId, flip) {
    const isHomeTeam = teamId === homeTeamId;
    // if not flipped: home -> left rim, away -> right rim
    // if flipped: home -> right rim, away -> left rim
    if (!flip) {
      return isHomeTeam ? rimLeftPx : rimRightPx;
    } else {
      return isHomeTeam ? rimRightPx : rimLeftPx;
    }
  }


  const rightColumnPlayers = (flipCourt ? activeHomePlayers : activeAwayPlayers)
    .map(p => ({ ...p, teamId: flipCourt ? homeTeamId : awayTeamId }));

  const leftColumnPlayers = (flipCourt ? activeAwayPlayers : activeHomePlayers)
    .map(p => ({ ...p, teamId: flipCourt ? awayTeamId : homeTeamId }));

  return (
  <div className="court-main">
    {/* Court container */}
    <div className="court-container" onPointerDown={handlePointerDown}>
      <img
        className="court-image"
        src={courtImage}
        alt="Basketball Court"
        draggable={false}
      />
      <svg
        className="court-svg"
        ref={svgRef}
        viewBox={`0 0 ${COURT_WIDTH_PX} ${COURT_HEIGHT_PX}`}
      >
        {/* Debug layer */}
        {debug && (
          <g>
            {/* 3PT arcs */}
            <circle  
              className="3pt-arc"
              cx={rimLeftPx.x}
              cy={rimLeftPx.y}
              r={THREE_RADIUS_FT * scaleX}
              fill="none"
              stroke="red"
              strokeDasharray="6,4"
              opacity="0.5"
            />
            <circle
              cx={rimRightPx.x}
              cy={rimRightPx.y}
              r={THREE_RADIUS_FT * scaleX}
              fill="none"
              stroke="red"
              strokeDasharray="6,4"
              opacity="0.5"
            />

            {/* Rims */}
            <circle
              cx={rimLeftPx.x}
              cy={rimLeftPx.y}
              r={7.5}
              fill="none"
              stroke="red"
              opacity="0.5"
            />
            <circle
              cx={rimRightPx.x}
              cy={rimRightPx.y}
              r={7.5}
              fill="none"
              stroke="red"
              opacity="0.5"
            />

            {/* Corner 3 rectangles */}
            <rect
              x={ftToPxX(TopX)}
              y={ftToPxY(TopY)}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <rect
              x={ftToPxX(TopX)}
              y={BottomYPx}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <rect
              x={RightXPx}
              y={ftToPxY(TopY)}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <rect
              x={RightXPx}
              y={BottomYPx}
              width={rectWidthPx}
              height={rectHeightPx}
              fill="none"
              stroke="red"
              strokeDasharray="6 4"
              opacity="0.5"
            />
          </g>
        )}

        {/* Shots render marker*/}
        {shots.map((shot) => {
          // Decide which rim to draw to using teamId and flipCourt
          const shotFlip = shot.flipCourt ?? false;
          // If for some reason teamId is missing, fallback to using courtSide (legacy)
          const rim = shot.teamId
            ? getTargetRimByTeam(shot.teamId, shotFlip)
            : (shot.courtSide === "away"
                ? (shotFlip ? rimLeftPx : rimRightPx)
                : (shotFlip ? rimRightPx : rimLeftPx)
              );

          const targetRimX = rim.x;
          const targetRimY = rim.y;

            return (
              <g key={shot.id}>
                {shot.type === "shot" && (
                  <>
                    {shot.made ? (
                      <circle
                        cx={ftToPxX(shot.ftX)}
                        cy={ftToPxY(shot.ftY)}
                        r="5"
                        fill="none"
                        stroke="green"
                        strokeWidth="2"
                        opacity="0.5"
                      />
                    ) : (
                      <>
                        <line
                          x1={ftToPxX(shot.ftX) - 5}
                          y1={ftToPxY(shot.ftY) - 5}
                          x2={ftToPxX(shot.ftX) + 5}
                          y2={ftToPxY(shot.ftY) + 5}
                          stroke="red"
                          strokeWidth="2"
                          opacity="0.5"
                        />
                        <line
                          x1={ftToPxX(shot.ftX) + 5}
                          y1={ftToPxY(shot.ftY) - 5}
                          x2={ftToPxX(shot.ftX) - 5}
                          y2={ftToPxY(shot.ftY) + 5}
                          stroke="red"
                          strokeWidth="2"
                          opacity="0.5"
                        />
                      </>
                    )}
                  </>
                )}
                {debug && shot.type === "shot" && (
                  <>
                    <line
                      x1={ftToPxX(shot.ftX)}
                      y1={ftToPxY(shot.ftY)}
                      x2={targetRimX}
                      y2={targetRimY}
                      stroke="rgba(0,0,0,0.2)"
                    />
                    <text
                      x={ftToPxX(shot.ftX) + 8}
                      y={ftToPxY(shot.ftY) - 8}
                      fontSize={10}
                      fill="#222"
                    >
                      {shot.is3 ? "3PT" : "2PT"} ({Math.round(shot.distFt)})
                    </text>
                  </>
                )}
              </g>
            );
        })}
      </svg>
      </div>

      {/* Controls */}
      <div
        className="buttons-group"
        onPointerDown={(e) => e.stopPropagation()}
      >

        <button
          className={`game-control-btn ${
            selectedControl === "debug" ? "selected" : ""
          }`}
          onClick={() => {
            setDebug((prev) => !prev);
            setSelectedControl("debug");
          }}
        >
          {debug ? "Hide Debug" : "Show Debug"}
        </button>

        <button
          className="game-control-btn"
          onClick={() => onUndo()}
          disabled={shots.length === 0}
        >
          Undo Last Shot
        </button>

        <button
          className="game-control-btn"
          onClick={() => {
            setPendingShot({ 
              isFreeThrow: true,
              flipCourt
            });
            setPopupStep("player");
          }}
        >
          Free Throw
        </button>

        <button
          className="game-control-btn"
          onClick={() => {
            setPendingShot({
              ftX: COURT_WIDTH_FT / 2,
              ftY: COURT_HEIGHT_FT / 2,
              isBeyondHalfCourt: true,
              flipCourt,
            });
            setPopupStep("player");
          }}
        >
          Beyond Half Court
        </button>

        <button
          className="game-control-btn"
          onClick={() => {
            setPendingShot({
              isRebound: true,
              flipCourt,
            });
            setPopupStep("player");
          }}
        >
          Offensive Rebound
        </button>

        <button
          className="game-control-btn"
          onClick={() => {
            setPendingShot({
              isTurnover: true,
              flipCourt,
            });
            setPopupStep("player");
          }}
        >
          Turnover
        </button>

      </div>

      {/* Popup: active player selection */}
      {popupStep === "player" && pendingShot && (
        <div className="popup">
          {pendingShot.isFreeThrow ? (
            <h3>Select Shooter (Free Throw)</h3>
          ) : pendingShot.isBeyondHalfCourt ? (
            <h3>Select Shooter (Beyond Half Court)</h3>
          ) : pendingShot.isRebound ? (
            <h3>Select Player (Offensive Rebound)</h3>
          ) : pendingShot.isTurnover ? (
            <h3>Select Player (Turnover)</h3>
          ) : (
            <h3>
              Select Shooter (
              {pendingShot.courtSide === "away" ? awayTeamName : homeTeamName})
            </h3>
          )}
          {pendingShot.isFreeThrow || pendingShot.isBeyondHalfCourt ? (
            // Free Throw active roster
            <div className="free-throw-columns">
              {/* / away team active roster */}
              <div className="team-column">
                <h4>{flipCourt ? awayTeamName : homeTeamName}</h4>
                <ul>
                  {leftColumnPlayers.map((p, index) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPendingShot({
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          });
                          setPopupStep("result");
                        }}
                      >
                        ({index + 1}) - #{p.number} {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* / home team active roster */}
              <div className="team-column">
                <h4>{flipCourt ? homeTeamName : awayTeamName}</h4>
                <ul>
                  {rightColumnPlayers.map((p, index) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPendingShot({
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          });
                          setPopupStep("result");
                        }}
                      >
                        ({leftColumnPlayers.length + index + 1}) - #{p.number} {p.name}
                      </button>
                    </li>
                  ))}

                  {/* Cancel option as the last index */}
                  <li>
                    <button
                      onClick={() => {
                        setPendingShot(null);
                        setPopupStep(null);
                      }}
                    >
                      ({leftColumnPlayers.length + rightColumnPlayers.length + 1}) - Cancel
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            ) : pendingShot.isRebound || pendingShot.isTurnover ?(
            // Free Throw active roster
            <div className="free-throw-columns">
              {/* / away team active roster */}
              <div className="team-column">
                <h4>{flipCourt ? awayTeamName : homeTeamName }</h4>
                <ul>
                  {leftColumnPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          const eventData = {
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          };
                          finalizeShot(eventData);
                        }}
                      >
                        #{p.number} - {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {/* / home team active roster */}
              <div className="team-column">
                <h4>{flipCourt ? homeTeamName : awayTeamName}</h4>
                <ul>
                  {rightColumnPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          const eventData = {
                            ...pendingShot,
                            playerId: p.id,
                            teamId: p.teamId,
                          };
                          finalizeShot(eventData);
                        }}
                      >
                        #{p.number} - {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            ) : (
            <ul>
              {(pendingShot.courtSide === "away"
                ? activeAwayPlayers
                : activeHomePlayers
              ).map((p, index, arr) => {
                // populate popupPlayers once when list is rendered
                if (popupPlayers.length !== arr.length) {
                  setPopupPlayers(
                    arr.map((pp) => ({
                      ...pp,
                      teamId: pendingShot.courtSide === "away" ? awayTeamId : homeTeamId,
                    }))
                  );
                }

                return (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setPendingShot({
                          ...pendingShot,
                          playerId: p.id,
                          teamId:
                            pendingShot.courtSide === "away" ? awayTeamId : homeTeamId,
                        });
                        setPopupStep("result");
                      }}
                    >
                      ({index + 1}) - {p.name} ({p.number})
                    </button>
                  </li>
                );
              })}

              {/* Add cancel as last indexed option */}
              <li>
                <button
                  onClick={() => {
                    setPendingShot(null);
                    setPopupStep(null);
                  }}
                >
                  ({(pendingShot.courtSide === "away"
                    ? activeAwayPlayers.length
                    : activeHomePlayers.length) + 1}) - Cancel
                </button>
              </li>
            </ul>
          )}
          {/*
          <button
            onClick={() => {
              setPendingShot(null);
              setPopupStep(null);
            }}
          >
            Cancel
          </button>*/}
        </div>
      )}
      
      {/* Popup: result */}
      {popupStep === "result" && pendingShot && (
        <div className="popup">
          <h3>Shot Result</h3>
          <ul>
            <li>
              <button
                onClick={() => {
                  if (pendingShot.isFreeThrow) {
                    finalizeShot(true);
                  } else {
                    setPendingShot({ ...pendingShot, made: true });
                    setPopupStep("assist");
                  }
                }}
              >
                Made
              </button>
            </li>
            <li>
              <button onClick={() => finalizeShot(false)}>Missed</button>
            </li>
            <li>
              <button
                onClick={() => {
                  setPendingShot(null);
                  setPopupStep(null);
                }}
              >
                Cancel
              </button>
            </li>
          </ul>
        </div>
      )}
      {/* Popup: assist selection */}
      {popupStep === "assist" && pendingShot && (
        <div className="popup">
          <h3>Select Assister</h3>
          <ul>
            {(pendingShot.teamId === awayTeamId
              ? activeAwayPlayers
              : activeHomePlayers
            )
              .filter((p) => p.id !== pendingShot.playerId)
              .map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => finalizeShot(true, p.id)}
                  >
                    #{p.number} - {p.name}
                  </button>
                </li>
              ))}
          </ul>

          {/* No assist option */}
          <button onClick={() => finalizeShot(true, null)}>
              No Assist
          </button>

          <button
            onClick={() => {
              setPendingShot(null);
              setPopupStep(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}