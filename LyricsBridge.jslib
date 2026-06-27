mergeInto(LibraryManager.library, {
  SendLyricToUnity: function (ptr) {
    const text = UTF8ToString(ptr);

    // Unity のオブジェクト名とメソッド名に送る
    unityInstance.SendMessage("LyricsReceiver", "OnLyricsReceived", text);
  }
});
