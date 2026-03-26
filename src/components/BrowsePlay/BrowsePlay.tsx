import "./BrowsePlay.css";
import "../SearchBar/SearchBar.css";
import { useEffect, useRef, useState } from "react";
import refresh from "../../assets/refresh.svg";
import itemicon from "../../assets/music-bars-svgrepo-com (2).svg";
import plus from "../../assets/align-bottom-svgrepo-com.svg";
import { song } from "../../App";
import { FiSearch } from "react-icons/fi";

import { toast } from "react-toastify";

type data = {
  data: playlist[];
  changeScreen: React.Dispatch<React.SetStateAction<string>>;
  changePlaylist: React.Dispatch<React.SetStateAction<song[]>>;
  setPlaylistData: React.Dispatch<React.SetStateAction<playlist[]>>;
};

export type playlist = {
  name: string;
  url: string;
};

export default function BrowsePlay({
  data,
  changeScreen,
  changePlaylist,
  setPlaylistData,
}: data) {
  const _ref = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
  });

  const [filteredPlaylist, setFilteredPlaylist] = useState(data);
  const [downloading, setDownloading] = useState(false);

  //variable to prevent multiple toasts from being generated (main process sends a lot of signals, can't do anything about that)
  const [recievedSignal, setRecieved] = useState(false);
  useEffect(() => {
    console.log("LISTENER FOR DOWNLOADED WAS ADDED");
    let count = 0;
    function handleDownloaded(_event: Electron.Event, _arg: any) {
      setTimeout(() => {
        if (recievedSignal === false) {
          // console.log("Downloaded signal received:", event);
          setRecieved(true);
          console.log(`Recieved: ${recievedSignal}`);
          count = count + 1;
          console.log(count);

          setDownloading(false);
          toast("Playlist Updated", { autoClose: 1000 });

          fetchAllPlaylists();
        }
      }, 500);
    }

    window.ipcRenderer.on("Downloaded", handleDownloaded);

    return () => {
      console.log("LISTENER FOR DOWNLOADED WAS REMOVED");
      window.ipcRenderer.removeListener("Downloaded", handleDownloaded);
    };
  }, []);

  //search functionality
  useEffect(() => {
    setFilteredPlaylist(data);
  }, [data]);

  // This function is to be called when the python process sends a signal with a response code from the main process
  async function fetchAllPlaylists() {
    const data = await window.ipcRenderer.invoke("fetchAllPlaylists");
    //Read userdata file and load every playlist written into it.
    await setPlaylistData(data);
    console.log("Playlists: ", data);
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    console.log(formData);
  };

  // scroll tracking removed
  // console.log(data)

  async function downloadPlaylist(
    URL: string,
    PlaylistName: string,
    bypassLimit: boolean = false
  ) {
    //Accidental click, handling empty fields
    if (URL.length === 0 || PlaylistName.length === 0) {
      toast.warn("Invalid Input");
      return;
    }

    //FOR SOME REASON THESE TWO ARE REVERSED, NEED TO LOOK INTO THIS ⚠
    console.log(`PlaylistName: ${PlaylistName}, URL: ${URL}`);

    const regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/
    if(!regex.test(PlaylistName)){

      toast.warn("Invalid URL")
      return;
    }

    //Prevent more than one download request at a time
    if (bypassLimit === false) {
      if (downloading === true) {
        toast.warn("Already Downloading");
        return;
      }
    }

    //add a form validation step here to save on accidental calls to youtube
    //---TODO---

    //Reset the name and url to be empty
    setFormData({ name: "", url: "" });

    //disabled the download button, and notify the user that the download request is underway
    setDownloading(true);

    //set the recieved signal to be false (This variable exists to prevent multiple toasts from being generated needlessly)
    setRecieved(false);
    toast(`Pulling Changes for \n${URL}`);

    try {
      const data = await window.ipcRenderer.invoke(
        "downloadPlaylist",
        PlaylistName,
        URL
      );
      console.log(data);
    } catch (err) {
      console.log(
        "-----------Err---------Between--------Dwnld-----------------------"
      );
      console.log(err);
    }
  }

  async function fetchSongs(playlist: string) {
    const data = await window.ipcRenderer.invoke(fetchSongs.name, playlist);
    console.log(data);
    return data;
  }

  async function setPlaylist(name: any) {
    const data = await fetchSongs(name);
    changePlaylist(data);
    changeScreen("Player");
  }

  function filterPlaylist(query: string) {
    const filtered = data.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    );
    setFilteredPlaylist(filtered);
  }

  function handleSearchInput(event: React.ChangeEvent<HTMLInputElement>) {
    const query = event.target.value.toLowerCase();
    filterPlaylist(query);
  }

  function handleRefreshPlaylist(Playlist: playlist) {
    downloadPlaylist(Playlist.name, Playlist.url, true);
  }

  return (
    <>
      <div className="box">
        {/* Search Bar */}
        <div className="search-pill">
          <input
            className="browse-search"
            type="text"
            placeholder="Search"
            onChange={handleSearchInput}
            onPointerDownCapture={(e) => e.stopPropagation()}
          ></input>
          <FiSearch className="search-icon" />
          {/* REFRESH BUTTON */}
          <img
            className="refresh-global"
            src={refresh}
            onClick={fetchAllPlaylists}
          ></img>
        </div>
      </div>

      <div className="main-div">
        <ul className="add-ul">
          {/* Download Playlist Card */}
          <li
            className="add-li"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <button
              className="add-butt"
              onClick={() => {
                downloadPlaylist(formData.name, formData.url);
              }}
            >
              <img className={downloading ? "add-button-locked" : "add-button"} src={plus}></img>
            </button>
            <div className="add-data">
              <input
                className="txt-box"
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={handleInputChange}
                name="name"
              ></input>
              <input
                className="txt-box"
                type="text"
                placeholder="URL"
                value={formData.url}
                onChange={handleInputChange}
                name="url"
              ></input>
            </div>
          </li>

          {/* Empty state */}
          {filteredPlaylist.length === 0 && (
            <li className="empty-state">
              <p className="empty-title">No playlists yet</p>
              <p className="empty-sub">Add a YouTube URL above to get started ↑</p>
            </li>
          )}

          {/* User Playlist Cards */}
          {filteredPlaylist.map((item, index) => (
            <li className="item-cards" key={index}>
              <div className="item-div">
                <div>
                  <img
                    className="item-icon"
                    src={itemicon}
                    onClick={() => {
                      setPlaylist(item.name);
                    }}
                  ></img>
                </div>
                {item.name}
                <img
                  className="refresh-icon"
                  src={refresh}
                  onClick={() => handleRefreshPlaylist(item)}
                ></img>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
