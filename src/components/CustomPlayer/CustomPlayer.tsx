import { useEffect, useRef, useState, useCallback } from "react";
import "./CustomPlayer.css";
import { motion } from "framer-motion";
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaRandom, FaRedo } from "react-icons/fa";
import next from "../../assets/next-button.svg";
import prev from "../../assets/prev-button.svg";
import { song } from "../../App";
import qicon from "../../assets/music-alt.svg";
import { convertToHumanReadable, truncate, shuffleArray } from "../../utils";

type customPlayer = {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentPlaylist: song[];
};

// Repeat modes: 0 = off, 1 = repeat-all, 2 = repeat-one
type RepeatMode = 0 | 1 | 2;

export default function CustomPlayer({ audioRef, currentPlaylist }: customPlayer) {
  const audioElem = audioRef;

  const [isPlaying, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.43);
  const [isMuted, setMuted] = useState(false);
  const [index, setIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<song | null>(currentPlaylist[0] || null);
  const [filteredSongs, setFilteredSongs] = useState(currentPlaylist);

  const [isShuffled, setShuffled] = useState(false);
  const [shuffledList, setShuffledList] = useState<song[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(0);

  // The "active" playlist: either shuffled or original
  const activePlaylist = isShuffled ? shuffledList : currentPlaylist;

  // Keep a ref of current index + repeat mode for use inside event listeners (avoids stale closure)
  const indexRef = useRef(index);
  const repeatRef = useRef(repeatMode);
  const activePlaylistRef = useRef(activePlaylist);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { activePlaylistRef.current = activePlaylist; }, [activePlaylist]);

  // ---------- playback helpers ----------
  function playSongAtIndex(idx: number, playlist: song[]) {
    if (!audioElem.current || !playlist[idx]) return;
    audioElem.current.src = playlist[idx].path;
    audioElem.current.play();
    setCurrentTrack(playlist[idx]);
    setIndex(idx);
    setPlaying(true);
  }

  const handleNext = useCallback(() => {
    const list = activePlaylistRef.current;
    const cur = indexRef.current;
    const repeat = repeatRef.current;

    if (repeat === 2) {
      // repeat-one: restart same track
      if (audioElem.current) {
        audioElem.current.currentTime = 0;
        audioElem.current.play();
        setPlaying(true);
      }
      return;
    }

    const next = (cur + 1) % list.length;
    // If repeat-all wraps around, or normal just advance
    if (next === 0 && repeat === 0) {
      // No repeat — stop at end
      setPlaying(false);
      return;
    }
    playSongAtIndex(next, list);
  }, []);

  function handlePrev() {
    const list = activePlaylist;
    // If we're > 3s in, restart the track instead of going back
    if (audioElem.current && audioElem.current.currentTime > 3) {
      audioElem.current.currentTime = 0;
      return;
    }
    const newIndex = index - 1 < 0 ? 0 : index - 1;
    playSongAtIndex(newIndex, list);
  }

  function handleMusicToggle() {
    if (!audioElem.current) return;
    if (isPlaying) {
      audioElem.current.pause();
    } else {
      audioElem.current.play();
    }
    setPlaying(!isPlaying);
  }

  // ---------- shuffle ----------
  function toggleShuffle() {
    if (!isShuffled) {
      const shuffled = shuffleArray(currentPlaylist);
      setShuffledList(shuffled);
      // keep the current track first in the new shuffled list so nothing skips
      const currentInShuffled = shuffled.indexOf(currentTrack);
      setIndex(currentInShuffled < 0 ? 0 : currentInShuffled);
    } else {
      // going back to original: find current track position
      const originalIndex = currentPlaylist.indexOf(currentTrack);
      setIndex(originalIndex < 0 ? 0 : originalIndex);
    }
    setShuffled((s) => !s);
  }

  // ---------- repeat ----------
  function cycleRepeat() {
    setRepeatMode((m) => ((m + 1) % 3) as RepeatMode);
  }

  // ---------- volume / mute ----------
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioElem.current) {
      audioElem.current.volume = val;
      audioElem.current.muted = false;
      setMuted(false);
    }
  };

  function toggleMute() {
    if (!audioElem.current) return;
    const next = !isMuted;
    audioElem.current.muted = next;
    setMuted(next);
  }

  // ---------- seek ----------
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioElem.current) {
      audioElem.current.currentTime = seekTime;
    }
  };

  // ---------- song picker from queue ----------
  function changeSong(s: song) {
    const idx = activePlaylist.indexOf(s);
    playSongAtIndex(idx < 0 ? 0 : idx, activePlaylist);
  }

  // ---------- filter queue ----------
  function handleSearchInput(event: React.ChangeEvent<HTMLInputElement>) {
    const query = event.target.value.toLowerCase();
    setFilteredSongs(
      currentPlaylist.filter((s) => s.name.toLowerCase().includes(query))
    );
  }

  // ---------- audio event listeners ----------
  useEffect(() => {
    if (audioElem.current && currentPlaylist[index]) {
      audioElem.current.volume = volume;
      audioElem.current.src = currentPlaylist[index].path;
    }

    function updateTime() {
      if (audioElem.current) setCurrentTime(audioElem.current.currentTime);
    }
    function updateDuration() {
      if (audioElem.current) setDuration(audioElem.current.duration);
    }
    function updateVolume() {
      if (audioElem.current) setVolume(audioElem.current.volume);
    }

    audioElem.current?.addEventListener("timeupdate", updateTime);
    audioElem.current?.addEventListener("loadedmetadata", updateDuration);
    audioElem.current?.addEventListener("volumechange", updateVolume);
    audioElem.current?.addEventListener("ended", handleNext);

    return () => {
      audioElem.current?.removeEventListener("timeupdate", updateTime);
      audioElem.current?.removeEventListener("loadedmetadata", updateDuration);
      audioElem.current?.removeEventListener("volumechange", updateVolume);
      audioElem.current?.removeEventListener("ended", handleNext);
    };
  }, [index]);

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't fire when user is typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          handleMusicToggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
        case "KeyM":
          toggleMute();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, isMuted]);

  // ---------- repeat icon label ----------
  const repeatLabel = repeatMode === 0 ? "Off" : repeatMode === 1 ? "All" : "One";

  return (
    <div className="custom-player">
      {/* PLAYER SIDE */}
      <div className="player-side">
        <p className="song-name">
          {currentTrack ? truncate(currentTrack.name.replace(/\.[^/.]+$/, ""), 74) : "No song selected"}
        </p>

        <div className="seekbar-div">
          <input
            className="seekbar"
            onPointerDownCapture={(e) => e.stopPropagation()}
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
          />
        </div>

        <div className="timestamp">
          <div className="current-time">{convertToHumanReadable(currentTime)}</div>
          <div className="duration-time">{convertToHumanReadable(duration)}</div>
        </div>

        {/* Shuffle + Main controls + Repeat */}
        <div className="control">
          {/* Shuffle */}
          <motion.button
            className={`icon-btn ${isShuffled ? "icon-btn--active" : ""}`}
            onClick={toggleShuffle}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            title="Shuffle"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <FaRandom size={16} />
          </motion.button>

          {/* Prev */}
          <motion.button
            className="prev-next-buttons"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <img className="prev-butt" src={prev} onClick={handlePrev} />
          </motion.button>

          {/* Play / Pause */}
          <div
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="playpause-button"
            onClick={handleMusicToggle}
            style={{ cursor: "pointer" }}
          >
            <motion.div
              initial={false}
              animate={{ scale: isPlaying ? 0.9 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {isPlaying ? <FaPause size={32} /> : <FaPlay size={32} />}
            </motion.div>
          </div>

          {/* Next */}
          <motion.button
            className="prev-next-buttons"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <img className="next-butt" src={next} onClick={handleNext} />
          </motion.button>

          {/* Repeat */}
          <motion.button
            className={`icon-btn ${repeatMode !== 0 ? "icon-btn--active" : ""}`}
            onClick={cycleRepeat}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            title={`Repeat: ${repeatLabel}`}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <FaRedo size={16} />
            {repeatMode !== 0 && <span className="repeat-label">{repeatLabel === "One" ? "1" : ""}</span>}
          </motion.button>
        </div>

        {/* Volume row */}
        <motion.div
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="vol-div"
          whileHover={{ scale: 1.02 }}
        >
          <motion.button
            className="icon-btn mute-btn"
            onClick={toggleMute}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
          </motion.button>
          <input
            type="range"
            min={0.0}
            max={1.0}
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            className="vol-bar"
          />
        </motion.div>
      </div>

      {/* QUEUE SIDE */}
      <div className="queue-card">
        <div className="q-card-search">
          <input
            className="q-searchbox"
            type="text"
            onChange={handleSearchInput}
            placeholder="Search Playlist"
            onPointerDownCapture={(e) => e.stopPropagation()}
          />
        </div>

        <div className="main-queue-list">
          <div className="queue-list" onPointerDownCapture={(e) => e.stopPropagation()}>
            {filteredSongs.map((song, i) => {
              const isActive = song.path === currentTrack.path;
              return (
                <button
                  key={i}
                  className={`q-item-names ${isActive ? "q-item-names--active" : ""}`}
                  onClick={() => changeSong(song)}
                >
                  <img src={qicon} className="queue-icon" />
                  <div className="q-item-text">
                    {truncate(song.name.replace(/\.[^/.]+$/, ""), 32)}
                  </div>
                  {isActive && <span className="now-playing-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
