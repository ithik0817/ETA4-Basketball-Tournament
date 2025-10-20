// src/components/Court.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import courtImage from "../images/FIBA_Court.svg";

export default function Court({
  onAddEvent,
  selectedPlayerId,
  selectedTeamId,
  onUndo,
  events,
  quarter,
  activeHomePlayers,
  activeAwayPlayers,
  homeRoster,
  awayRoster,
  homeTeamId,
  awayTeamId,
  flipCourt,
  homeTeamName,
  awayTeamName,
  role,
  onFilterChange,
}) {

  const svgRef = useRef(null);
  const [debug, setDebug] = useState(false);
  const [pendingShot, setPendingShot] = useState(null);
  const [popupStep, setPopupStep] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);
  const [popupPlayers, setPopupPlayers] = useState([]);
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterPlayer, setFilterPlayer] = useState("all");
  const [filterQuarter, setFilterQuarter] = useState("all");

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



  const handleCancel = useCallback(() => {
    setPendingShot(null);
    setPopupStep(null);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      handleCancel();
      return;
    }

    if (popupStep !== "player") return;

    if (e.code.startsWith("Digit")) {
      const idx = parseInt(e.key, 10) - 1;
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
  }, [popupStep, popupPlayers, pendingShot, handleCancel]);

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

    const offenseAllowed =
    (courtSide === "home" && role === "homeOffense") ||
    (courtSide === "away" && role === "awayOffense") || 
    role === "admin";

  if (!offenseAllowed ) {
    if (role === "homeDefense" || role === "awayDefense") {
      alert(`You are not allowed to track shots.`);
    }
    else{
    const teamName =
      courtSide === "home" ? homeTeamName : awayTeamName;
      alert(`You are not allowed to track shots for the ${teamName} team.`);
    }
    return;
  }

    console.log("flipCourt:", flipCourt);
    console.log("ftX:", ftX);
    console.log("Court Side determined:", courtSide);

    // If validation passes, proceed with setting the pendingShot
    setPendingShot({
      x: e.clientX,
      y: e.clientY,
      ftX,
      ftY,
      courtSide,
      flipCourt,
      isFreeThrow: false,
      role
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
      role,
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
        made: !!made,
        points: 1,
        distFt: 15,
        quarter,
        flipCourt,
        role: role,
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
        role: role,
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
        role,
      };
    }

    onAddEvent(newEvent);
    setPendingShot(null);
    setPopupStep(null);
    console.log("newEvent", newEvent);
  }

  function getTargetRimByTeam(teamId, flip) {
    const isHomeTeam = teamId === homeTeamId;
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

  const filteredEvents = events.filter((e) => {
    const matchTeam = filterTeam === "all" || e.teamId === filterTeam;
    const matchPlayer = filterPlayer === "all" || e.playerId === filterPlayer;
    const matchQuarter = filterQuarter === "all" || e.quarter?.toString() === filterQuarter;
    return matchTeam && matchPlayer && matchQuarter;
  });

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ team: filterTeam, player: filterPlayer, quarter: filterQuarter });
    }
  }, [filterTeam, filterPlayer, filterQuarter]);

  return (
  <div className="court-main">
    
    <div className="filter-bar">
      <label>
        Team:
        <select
          value={filterTeam}
          onChange={(e) => {
            setFilterTeam(e.target.value);
            setFilterPlayer("all"); // reset player when switching team
          }}
        >
          <option value="all">All Teams</option>
          <option value={homeTeamId}>{homeTeamName}</option>
          <option value={awayTeamId}>{awayTeamName}</option>
        </select>
      </label>

      <label>
        Player:
        <select
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
        >
          <option value="all">All Players</option>
          {filterTeam === homeTeamId &&
            homeRoster.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.name}
              </option>
            ))}
          {filterTeam === awayTeamId &&
            awayRoster.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.name}
              </option>
            ))}
        </select>
      </label>

      <label>
        Quarter:
        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
        >
          <option value="all">All Quarters</option>
          <option value="1">Q1</option>
          <option value="2">Q2</option>
          <option value="3">Q3</option>
          <option value="4">Q4</option>
          <option value="OT">OT</option>
        </select>
      </label>
    </div>

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

        
        {filteredEvents.map((event) => {
          // Decide which rim to draw to using teamId and flipCourt
          const eventFlip = event.flipCourt ?? false;
          // If for some reason teamId is missing, fallback to using courtSide (legacy)
          const rim = event.teamId
            ? getTargetRimByTeam(event.teamId, eventFlip)
            : (event.courtSide === "away"
                ? (eventFlip ? rimLeftPx : rimRightPx)
                : (eventFlip ? rimRightPx : rimLeftPx)
              );

          const targetRimX = rim.x;
          const targetRimY = rim.y;

            return (
              <g key={event.id}>
                {event.type === "shot" && (
                  <>
                    {event.made ? (
                      <circle
                        cx={ftToPxX(event.ftX)}
                        cy={ftToPxY(event.ftY)}
                        r="5"
                        fill="none"
                        stroke="green"
                        strokeWidth="2"
                        opacity="0.5"
                      />
                    ) : (
                      <>
                        <line
                          x1={ftToPxX(event.ftX) - 5}
                          y1={ftToPxY(event.ftY) - 5}
                          x2={ftToPxX(event.ftX) + 5}
                          y2={ftToPxY(event.ftY) + 5}
                          stroke="red"
                          strokeWidth="2"
                          opacity="0.5"
                        />
                        <line
                          x1={ftToPxX(event.ftX) + 5}
                          y1={ftToPxY(event.ftY) - 5}
                          x2={ftToPxX(event.ftX) - 5}
                          y2={ftToPxY(event.ftY) + 5}
                          stroke="red"
                          strokeWidth="2"
                          opacity="0.5"
                        />
                      </>
                    )}
                  </>
                )}
                {debug && event.type === "shot" && (
                  <>
                    <line
                      x1={ftToPxX(event.ftX)}
                      y1={ftToPxY(event.ftY)}
                      x2={targetRimX}
                      y2={targetRimY}
                      stroke="rgba(0,0,0,0.2)"
                    />
                    <text
                      x={ftToPxX(event.ftX) + 8}
                      y={ftToPxY(event.ftY) - 8}
                      fontSize={10}
                      fill="#222"
                    >
                      {event.is3 ? "3PT" : "2PT"} ({Math.round(event.distFt)})
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
          {debug ? "Hide Details" : "Show Details"}
        </button>

        <button
          className="game-control-btn"
          onClick={() => onUndo()}
          disabled={events.length === 0}
        >
          Undo
        </button>
        {(role === 'homeOffense' || role === 'awayOffense' || role === "admin") && (
          <>
            <button
              className="game-control-btn"
              onClick={() => {
                setPendingShot({ 
                  isFreeThrow: true,
                  flipCourt,
                  role,
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
                  role,
                });
                setPopupStep("player");
              }}
            >
              Beyond Half Court
            </button>
          </>
        )}
        {/* 
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
        */}
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
          {pendingShot.isFreeThrow || pendingShot.isBeyondHalfCourt ? (role === "admin" ? 
          (
            <div className="free-throw-columns">
            {/* Left column (one team) */}
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
            {/* Right column (other team) */}
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
              </ul>
            </div>
          </div>
        ) : (
          <div className="team-column">
            <h4>
              {role === "homeOffense"
                ? homeTeamName
                : role === "awayOffense"
                ? awayTeamName
                : ""}
            </h4>
            <ul>
              {(role === "homeOffense" ? activeHomePlayers : activeAwayPlayers).map(
                (p, index) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setPendingShot({
                          ...pendingShot,
                          playerId: p.id,
                          teamId:
                            role === "homeOffense" ? homeTeamId : awayTeamId,
                        });
                        setPopupStep("result");
                      }}
                    >
                      ({index + 1}) - #{p.number} {p.name}
                    </button>
                  </li>
                )
              )}
            </ul>
          </div>
        )
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
                if (popupPlayers.length !== arr.length) {
                  setPopupPlayers( 
                    arr.map((pp) => ({
                      ...pp,
                      teamId: pendingShot.courtSide === "away" 
                        ? awayTeamId 
                        : homeTeamId, 
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
                          teamId: pendingShot.courtSide === "away" 
                            ? awayTeamId
                            : homeTeamId, 
                        }); 
                        setPopupStep("result"); 
                      }} 
                    > 
                      ({index + 1}) - #{p.number} {p.name} 
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          
          <button onClick={handleCancel}>
            Cancel
          </button>
          </div>
        )}
      
      {/* Popup: event result */}
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
              <button onClick={handleCancel}>
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

          <button onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}