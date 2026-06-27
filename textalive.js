//グローバル変数
let unityInstance = null;
let canPlay = false;
let lastPhrase = null;
let isPlayerReady = false;

//歌詞表示のタイマー
let lyricClearTimer = null;

const player = new TextAliveApp.Player({
  app: { token: "YV8DENNnhGF7C6Xz" }
});

//TextAliveプレイヤー
player.addListener({
  onAppReady(app) {
    console.log("TextAlive: onAppReady - app ready");
    
    if (!app.songUrl) {
      console.log("TextAlive: creating song from URL");
      player.createFromSongUrl("https://piapro.jp/t/6W2N/20251215164617", {
        video: {
          beatId: 4827293,
          chordId: 2963754,
          repetitiveSegmentId: 3086261,
          lyricId: 126519,
          lyricDiffId: 28645,
        },
      });
    }
  },

  onVideoReady: () => {
    console.log("TextAlive: onVideoReady - video ready");
    window.textaliveReady = true;
    isPlayerReady = true;
    
    notifyTextAliveReady();
  },

  onTimeUpdate(position) {
    console.log("onTimeUpdate:", position);
    if (!player.video) {
      return;
    }

    //歌詞処理
    const phrase = player.video.findPhrase(position);

    if (phrase && phrase !== lastPhrase) {
      lastPhrase = phrase;
      console.log("TextAlive: phrase updated -", phrase.text);
      
      //歌詞を表示
      displayPhrase(phrase.text);
      
      // Unityに歌詞を送信
      sendLyricToUnity(phrase);

      //タイマーをクリア
      if (lyricClearTimer !== null) {
        clearTimeout(lyricClearTimer);
      }

      //歌詞が歌い終わる時間に自動消去
      const timeUntilEnd = (phrase.endTime || 0) - position;
      lyricClearTimer = setTimeout(() => {
        clearLyrics();
      }, timeUntilEnd + 500);
    }
  },

  onPlay: () => {
    console.log("TextAlive: onPlay - player started");
    canPlay = true;
  },

  onPause: () => {
    console.log("TextAlive: onPause - player paused");
    canPlay = false;
  },

  onStop: () => {
    console.log("TextAlive: onStop - player stopped");
    canPlay = false;
    lastPhrase = null;
    clearLyrics();  //歌詞を消去
  },

  onError: (e) => {
    console.error("TextAlive: Error occurred", e);
  }
});


// Unityへのデータ送信
/**
 * Unityに歌詞を送信する
 * @param {Object} phrase
 */
function sendLyricToUnity(phrase) {
  if (!unityInstance) {
    console.warn("Unity instance not available");
    return;
  }

  try {
    //歌詞テキスト
    const lyricText = phrase.text || "";
    
    //歌詞をJSON 形式で作成
    const lyricData = {
      text: lyricText,
      startTime: phrase.startTime || 0,
      endTime: phrase.endTime || 0,
      duration: (phrase.endTime || 0) - (phrase.startTime || 0),
      index: phrase.index || 0
    };

    const lyricJson = JSON.stringify(lyricData);

    console.log("Sending lyric to Unity:", lyricJson);

    //Unityにメッセージ送信
    unityInstance.SendMessage("LyricsReceiver", "OnLyricsReceived", lyricJson);

  } catch (e) {
    console.error("Failed to send lyric to Unity:", e);
  }
}

//Unityインスタンスを登録する
window.onUnityLoaded = function(instance) {
  console.log("Unity: instance loaded");
  unityInstance = instance;
  
  //TextAliveが準備完了していれば通知
  if (isPlayerReady) {
    notifyTextAliveReady();
  }
};

//TextAlive準備完了をUnityに通知
function notifyTextAliveReady() {
  console.log("Notifying Unity: TextAlive is ready");
  
  if (unityInstance) {
    try {
      unityInstance.SendMessage("FlowerController", "OnTextAliveReady");
      console.log("Sent OnTextAliveReady to FlowerController");
    } catch (e) {
      console.error("Failed to send message to Unity:", e);
    }
  } else {
    console.warn("Unity instance not yet available");
  }
}

//Unityから呼ばれる再生開始
window.StartTextAlive = function() {
  console.log("StartTextAlive called from Unity");

  if (!isPlayerReady) {
    console.warn("TextAlive player is not ready yet");
    return;
  }

  if (!player || !player.video) {
    console.warn("player.video is not available");
    return;
  }

  console.log("Requesting TextAlive playback");
  
  try {
    //ユーザーインタラクション後に再生
    player.requestPlay();
    console.log("Play requested");
  } catch (e) {
    console.error("Failed to request play:", e);
  }
};


// UI 更新関数
let currentLyricBuffer = [];  // 歌詞（2行保持）

// 歌詞をページに表示
function displayPhrase(text) {
  console.log("Displaying phrase:", text);
  
  // 歌詞追加（最大2行）
  currentLyricBuffer.push(text);
  if (currentLyricBuffer.length > 2) {
    currentLyricBuffer.shift();
  }

  let lyricDisplay = document.getElementById("lyric-display");
  if (!lyricDisplay) {
    lyricDisplay = document.createElement("div");
    lyricDisplay.id = "lyric-display";
    lyricDisplay.style.cssText = `
      position: fixed;
      right: 250px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      color: white;
      padding: 20px 0;
      border-radius: 0;
      font-size: 25px;
      font-weight: bold;
      z-index: 9999;
      max-width: 400px;
      word-wrap: break-word;
      word-break: break-all;
      text-align: right;
      font-family: 'Noto Sans JP', sans-serif;
      line-height: 1.8;
      animation: lyricFadeIn 0.5s ease-in;
    `;
    
    //animationを追加
    if (!document.getElementById("lyric-animation")) {
      const style = document.createElement("style");
      style.id = "lyric-animation";
      style.textContent = `
        @keyframes lyricFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes lyricFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        .lyric-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: right;
        }
        
        .lyric-line {
          display: block;
          word-break: break-all;
          line-height: 1.4;
        }
        
        .current-lyric {
          position: relative;
          display: block;
          padding-bottom: 10px;
          word-break: break-all;
          line-height: 1.4;
        }
        
        /* 歌詞の下にラインを引く */
        .current-lyric::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #00ffff, transparent);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        }
        
        .next-lyric {
          opacity: 0.6;
          font-size: 25px;
          color: rgba(255, 255, 255, 0.6);
          word-break: break-all;
          line-height: 1.4;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(lyricDisplay);
  }
  
  //HTMLを構築
  let htmlContent = '<div class="lyric-container">';
  
  if (currentLyricBuffer.length >= 1) {
    htmlContent += `<div class="current-lyric">${currentLyricBuffer[0]}</div>`;
  }
  
  if (currentLyricBuffer.length >= 2) {
    htmlContent += `<div class="current-lyric">${currentLyricBuffer[1]}</div>`;
  }
  
  htmlContent += '</div>';
  
  lyricDisplay.innerHTML = htmlContent;
  lyricDisplay.style.animation = "lyricFadeIn 0.5s ease-in forwards";
}

//歌詞を消去
function clearLyrics() {
  console.log("Clearing lyrics");
  
  const lyricDisplay = document.getElementById("lyric-display");
  if (lyricDisplay) {
    lyricDisplay.style.animation = "lyricFadeOut 0.5s ease-out forwards";
    
    //アニメーション終了後非表示
    setTimeout(() => {
      lyricDisplay.innerHTML = '';
      currentLyricBuffer = [];
    }, 500);
  }
}


//クリック検知
document.addEventListener('click', (event) => {
  if (!unityInstance) {
    console.warn("Unity instance not available for flower effect");
    return;
  }

  //クリック位置をCanvas座標に変換
  const canvas = document.querySelector("#unity-canvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  //Canvas内でのクリックかを確認
  if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;

    console.log(`Flower click at normalized coords: (${normalizedX}, ${normalizedY})`);

    try {
      unityInstance.SendMessage("FlowerController", "OnFlowerClick", 
        JSON.stringify({ x: normalizedX, y: normalizedY }));
    } catch (e) {
      console.error("Failed to send flower click to Unity:", e);
    }
  }
});


//初期化確認用のデバッグ
window.debugTextAliveStatus = function() {
  console.log("=== TextAlive Debug Status ===");
  console.log("isPlayerReady:", isPlayerReady);
  console.log("unityInstance:", unityInstance ? "loaded" : "not loaded");
  console.log("player.video:", player.video ? "ready" : "not ready");
  console.log("canPlay:", canPlay);
  console.log("Current player state:", player.state);
  console.log("==============================");
};

//ページロード完了時に状態を出力
window.addEventListener("load", () => {
  console.log("Page loaded - checking TextAlive status");
  setTimeout(() => {
    window.debugTextAliveStatus();
  }, 1000);
});