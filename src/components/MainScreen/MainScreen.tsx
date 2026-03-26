import { useEffect, useState } from "react";
import "./MainScreen.css";
import Card from "../Card/Card";
import Menu from "../Menu/Menu";
import { AnimatePresence } from "framer-motion";
import CustomPlayer from "../CustomPlayer/CustomPlayer";
import BrowsePlay, { playlist } from "../BrowsePlay/BrowsePlay";
import Queue from "../Queue/Queue";


export type song = {
  name:string,
  path:string
}


type mainScreenProps = {
    audioRef: React.RefObject<HTMLAudioElement>
}

function MainScreen({audioRef}:mainScreenProps) {

  //Not going into complicated routing, as there's only a small set of screens (if you can call it that) to be had here
    
  const [active, setActive] = useState<string>("Browse")
  const [playlistData, setPlaylistData] = useState<playlist[]>([])
  const [currentPlaylist, setCurrentPlaylist] = useState<song[]>([])
 

  //initialisation of the app, loading relevant data happens here for the first time
  useEffect(()=>{
    async function fetchAllPlaylists() {
      const data = await window.ipcRenderer.invoke("fetchAllPlaylists") 
      //Read userdata file and load every playlist written into it.   
      await setPlaylistData(data)
      console.log(data)
      //After loading that data, load the first playlist
      if (data[0]){
        await fetchSongs(data[0].name)
      }
      // console.log(currentPlaylist)
    }

    fetchAllPlaylists()

    async function fetchSongs(playlist:string) {
      const data = await window.ipcRenderer.invoke(fetchSongs.name, playlist)
      console.log(data)
      setCurrentPlaylist(data)
    }

  }, [])

  


  
  function getActiveComponent(target: string){
    // if(target===active){
    //   return ""
    // }
    switch (target){
      case 'Browse':
        return <BrowsePlay key="Browse" data={playlistData} changeScreen={setActive} changePlaylist={setCurrentPlaylist} setPlaylistData={setPlaylistData}/>

      case 'Player':
        return <CustomPlayer key="Player" audioRef={audioRef} currentPlaylist={currentPlaylist}/>

       case 'Queue':
        return <Queue key="Queue"/>
        // i have removed (data={currentPlaylist}) from above line
    }
  }

  
  
  return (
    <>
      <div className="main-area">
        <Card>
          <AnimatePresence>
          {getActiveComponent(active)}
          </AnimatePresence>
          <Menu setter={setActive}/>
          {/* <button onClick={()=>downloadPlaylist()}>DOWNLOAD</button> */}
          {/* <button onClick={()=>{fetchAllPlaylists()}}>Fetch All Playlists</button> */}
          {/* <button onClick={()=>{fetchSongs("Test")}}>Fetch All Songs</button> */}
        
        </Card>

        {/* Audio element is always present, globally so the song doesn't stop when moving between screens */}
        
      </div>
    </>
  );
}

export default MainScreen;
