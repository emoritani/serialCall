/**
 *  連続架電 - serialCall
 *
 *  @param idx  リストインデックス
 *  @param loop ループ回数
 */
// 架電先リスト
const callList = {
  "携帯1": "+8190xxxxxxxx",
  "携帯2": "+8180xxxxxxxx",
  "携帯3": "+8180xxxxxxxx",
};
// 発信元番号
const callFrom = '+8150xxxxxxxx';
// ループ回数（1以上の整数、1ならループしない）
const maxLoop = 2;
// 留守電チェック（する: true、しない: false)
const AMD = false;
// 呼び出し秒数
const timeout = 10;
// メッセージ
const message = "異常が発生いたしました。至急確認が必要です。";
// Functionsのドメイン名
const domain = "xxxxxxx-xxxxxxxx-xxxx.twil.io";

exports.handler = function(context, event, callback) {
  let idx = event.idx || 0; // インデックスパラメータを取得
  let loop = event.loop || 0; // ループパラメータを取得
  console.log('idx:' + idx + ', loop:' + loop);

  let number = callList[Object.keys(callList)[idx]];  // 架電先をリストから取得
  let callStatus = event.CallStatus || '';  // コールステータス取得
  let answeredBy = event.AnsweredBy || ''; // 留守電応答チェック取得
  console.log('CallStatus:' + callStatus);
  if (AMD) {
    console.log('AnsweredBy:' + answeredBy);
  }

// 架電するかをチェックする
  let fCall = false;  // 架電フラグ（true:する、false:しない）

  if (callStatus === 'in-progress') { // 応答あり
    if (AMD && /machine_start|fax/.test(answeredBy)) { // 人間以外が応答した場合
      fCall = true;
    } else {  // 人間が応答した場合
      let twiml = new Twilio.twiml.VoiceResponse()
      let sayParams = {
        language: 'ja-JP',
        voice: 'alice'
      }
      twiml.say(sayParams, message)
      callback(null, twiml)
    }
  } else if (callStatus === 'busy') { // 話中
    fCall = true;
  } else if (callStatus === 'failed') { // 失敗
    fCall = true;
  } else if (callStatus === 'no-answer') { // 応答なし
    fCall = true;
  } else if (callStatus === 'canceled') { // キャンセル
    fCall = true;
  } else if (callStatus === '') { // 初回呼び出し
    fCall = true;
  }

  // ループチェック
  if (loop >= maxLoop) { // ループ回数が最大値を超えたので終了
    console.log("ループ回数を越えたので終了");
    fCall = false;
  }

  // 架電作業
  if (fCall) {
    // 次にかけるべき電話番号のidxとloop回数を設定
    ++idx;	// インデックスをインクリメント
    if (idx >= Object.keys(callList).length) {  // リストの最後まで到達
      idx = 0;  // インデックスは0に戻す
      ++loop;	// ループ回数をインクリメント
    }
    // 架電
    const client = context.getTwilioClient()
    client.calls.create({
      to: number,
      from: callFrom,
      url: 'https://'+domain+'/serialCall?idx='+idx+'&loop='+loop,
      timeout: timeout,
      machineDetection: (AMD ? 'Enable' : ''),
      statusCallback: 'https://'+domain+'/serialCall?idx='+idx+'&loop='+loop
    })
    .then((call) => {
      callback(null, "OK")
    })
    .catch((error) => {
      callback(error)
    })
  } else {
    callback(null, "Call completed.")
  }
};
