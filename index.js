import express from 'express';
import request from 'request-promise';
import twilio from 'twilio';
import path from 'path';
import cheerio from 'cheerio';
import { LocalStorage } from 'node-localstorage';
import { Spinner } from 'cli-spinner';

const localStorage = new LocalStorage('./storage');
const publicDir = __dirname + "/../www/";

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const PORT = process.env.PORT || 8082;
const phoneNumbers = process.env.NUMBERS;
const LOCAL_ARB_AMOUNT = parseInt(process.env.LOCAL_ARB_AMOUNT) || 300000;
const COINMAMA_ARB_AMOUNT = parseInt(process.env.COINMAMA_ARB_AMOUNT) || 25000;
const INTERVAL = 10 * 60 * 1000;// check every 10 min
const USD_CLP_OFFSET = parseInt(process.env.USD_CLP_OFFSET) || 8;

const app = express();
const client = new twilio(accountSid, authToken);

app.get('/', function(req, res) {
    res.sendFile(path.join(publicDir + "index.html"));
});

app.use('/', express.static(publicDir));
app.get('/values/', function(req, res) {
	res.send(getValues());
});

app.listen(PORT);

fetchValues();
setInterval(fetchValues, INTERVAL);

function getValues() {
  return {
    coinmama_btc_usd: localStorage.getItem('values/coinmama_btc_usd'),
    coinmama_eth_usd: localStorage.getItem('values/coinmama_eth_usd'),
    cmkt_eth_sell: localStorage.getItem('values/cmkt_eth_sell'),
    cmkt_eth_buy: localStorage.getItem('values/cmkt_eth_buy'),
    buda_btc_buy: localStorage.getItem('values/buda_btc_buy'),
    buda_btc_sell: localStorage.getItem('values/buda_btc_sell'),
    gdax_btc: localStorage.getItem('values/gdax_btc'),
    gdax_eth: localStorage.getItem('values/gdax_eth'),
    spank: localStorage.getItem('values/spank'),
    spank_perc: localStorage.getItem('values/spank_perc'),
    usd_clp: localStorage.getItem('values/usd_clp'),
    btc_eth: localStorage.getItem('values/btc_eth'),
    coinmama_arbitrage_eth: localStorage.getItem('values/coinmama_arbitrage_eth'),
    coinmama_arbitrage_btc: localStorage.getItem('values/coinmama_arbitrage_btc'),
    buda_cmkt_arbitrage: localStorage.getItem('values/buda_cmkt_arbitrage'),
  };
}

function fetchValues() {
  const spinner = new Spinner('fetching values %s');
  spinner.setSpinnerString('|/-\\');
  spinner.start();

  let promises = [];
  promises.push(fetchCoinmamaEth());
  promises.push(fetchCoinmamaBtc());
  promises.push(fetchCmktEthSell());
  promises.push(fetchCmktEthBuy());
  promises.push(fetchBudaBtc());
  promises.push(fetchGdaxBtc());
  promises.push(fetchGdaxEth());
  promises.push(fetchSpank());
  promises.push(fetchUsdClp());

  Promise.all(promises).then(() => {
    
    // Calculate btc to eth ratio
    const btcEth = parseInt(localStorage.getItem('values/gdax_btc')) / parseInt(localStorage.getItem('values/gdax_eth'));
    localStorage.setItem('values/btc_eth', btcEth.toFixed(2)),

    spinner.stop();
    checkAlerts();
  });
}

function checkAlerts() {
  const spinner = new Spinner('checking for alerts %s');
  spinner.setSpinnerString('|/-\\');
  spinner.start();
  // check for alert conditions

  // Check for coinmama alert eth
  const coinmamaEth = parseFloat(localStorage.getItem('values/coinmama_eth_usd'));
  const usdPrice = parseInt(localStorage.getItem('values/usd_clp'));
  const priceOneEth = coinmamaEth*usdPrice;
  const cmktEthBuy = parseInt(localStorage.getItem('values/cmkt_eth_buy'));
  const profit = (cmktEthBuy-priceOneEth).toFixed(2);
  localStorage.setItem('values/coinmama_arbitrage_eth', profit);
  if (profit >= COINMAMA_ARB_AMOUNT) {
    sendAlert('coinmama_arb_eth', `coinmama arbitrage eth ${profit}`);
  }

  // Check for coinmama alert btc
  const coinmamaBtc = parseFloat(localStorage.getItem('values/coinmama_btc_usd'));
  const priceOneBtc = coinmamaBtc*usdPrice;
  const budaBtcBuy = parseInt(localStorage.getItem('values/buda_btc_buy'));
  const profit2 = (budaBtcBuy-priceOneBtc).toFixed(2);
  localStorage.setItem('values/coinmama_arbitrage_btc', profit2);
  if (profit2 >= COINMAMA_ARB_AMOUNT) {
    sendAlert('coinmama_arb_btc', `coinmama arbitrage btc ${profit2}`);
  }

  // check for buda/cmkt alert
  const budaBtcSell = parseInt(localStorage.getItem('values/buda_btc_sell'));
  const btcToEth = parseFloat(localStorage.getItem('values/btc_eth'));
  const profit3 = ((btcToEth*cmktEthBuy) - budaBtcSell).toFixed(2);
  localStorage.setItem('values/buda_cmkt_arbitrage', profit3);
  if (profit3 >= LOCAL_ARB_AMOUNT) {
    sendAlert('buda_cmkt_arb', `buda cmkt arbitrage ${profit3}`);
  }

  spinner.stop();
}

function sendAlert(alertName, message){
  const alertKey = `alerts/lastDate/${alertName}`;

  const d = new Date();
  const currentDate = d.getDate() +'/'+ (d.getMonth()+1) +'/'+ (d.getFullYear());
  const lastAlert = localStorage.getItem(alertKey);

  if (!lastAlert || lastAlert != currentDate) { // only one alert per day
    // Save current date as last alert ocurrence
    localStorage.setItem(alertKey, currentDate);
    phoneNumbers.split(',').forEach((n) => {
      console.log('Sending alert to: ' + n + ' Date:' + currentDate);
      client.messages.create({
        body: message,
        to: n,
        from: twilioNumber,
      }).then(message => console.log('message id: ' + message.sid)); 
    });
  
  }else{
    console.log('Already sent an alert today: ' + lastAlert);
  }
}

// Different api request to get prices

function fetchCoinmamaEth() {
  return request({
    method: 'POST',
    url: 'https://www.coinmama.com/ajax/get_packages',
    headers: { 
      'Cache-Control': 'no-cache',
      'cookie': '_ga=GA1.2.1749618640.1518005135; ftr_ncd=6; __ssid=a7165881-59cf-40ca-aae3-9d99fcf87062; __zlcmid=krh6X3YrVT0lcQ; PHPSESSID=cma22uvp7p1ib3kbt45fkdod62; _hjIncludedInSample=1; visid_incap_1551563=EtfLZg2mSbywpqcCx0MbmIfreloAAAAAQ0IPAAAAAACAQ1uCAb6kFGPCpnuB85RGM6nXz7yXaxuV; __context=QDakH4J938zEYqIRlbw6GkELZaSnGP01kSxrHVCjxaSryf0lj5/TUqJvCBlSJFMFo11ppalMioQILq2kU3HgWg==; incap_ses_785_1551563=pc2hVnQJ2zoQ+FAmj+HkClQejloAAAAAkGqivuRMUEsGjAqdI/RfZg==; __insp_wid=460266710; __insp_nv=true; __insp_targlpu=aHR0cHM6Ly93d3cuY29pbm1hbWEuY29tLw%3D%3D; __insp_targlpt=Q29pbm1hbWEgfCBCdXkgQml0Y29pbnMgd2l0aCBDcmVkaXQgQ2FyZA%3D%3D; __insp_norec_sess=true; ftr_blst_1h=1519264097683; __insp_slim=1519264939778; forterToken=41238d25135f4829be4b3f089edc1438_1519265548471__UDF4',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
    },
    formData: {
      token: 'd35ff5540b0be28064b9002c101ef289',
      'coins[]': 'eth',
    }
  }).then((res) => {
    const data = JSON.parse(res);
    const price = data.eth[3].price + 0.95;
    const qty = data.eth[3].qty;
    const coinmamaEthUsd = price/qty;
    localStorage.setItem('values/coinmama_eth_usd', coinmamaEthUsd.toFixed(2));
  }).catch((err) => {
    console.log('Error fetching coinmama eth', err);
  });
}

function fetchCoinmamaBtc() {
  return request({
    method: 'POST',
    url: 'https://www.coinmama.com/ajax/get_packages',
    headers: { 
      'Cache-Control': 'no-cache',
      'cookie': '_ga=GA1.2.1749618640.1518005135; ftr_ncd=6; __ssid=a7165881-59cf-40ca-aae3-9d99fcf87062; __zlcmid=krh6X3YrVT0lcQ; PHPSESSID=cma22uvp7p1ib3kbt45fkdod62; _hjIncludedInSample=1; visid_incap_1551563=EtfLZg2mSbywpqcCx0MbmIfreloAAAAAQ0IPAAAAAACAQ1uCAb6kFGPCpnuB85RGM6nXz7yXaxuV; __context=QDakH4J938zEYqIRlbw6GkELZaSnGP01kSxrHVCjxaSryf0lj5/TUqJvCBlSJFMFo11ppalMioQILq2kU3HgWg==; incap_ses_785_1551563=pc2hVnQJ2zoQ+FAmj+HkClQejloAAAAAkGqivuRMUEsGjAqdI/RfZg==; __insp_wid=460266710; __insp_nv=true; __insp_targlpu=aHR0cHM6Ly93d3cuY29pbm1hbWEuY29tLw%3D%3D; __insp_targlpt=Q29pbm1hbWEgfCBCdXkgQml0Y29pbnMgd2l0aCBDcmVkaXQgQ2FyZA%3D%3D; __insp_norec_sess=true; ftr_blst_1h=1519264097683; __insp_slim=1519264939778; forterToken=41238d25135f4829be4b3f089edc1438_1519265548471__UDF4',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
    },
    formData: {
      token: 'd35ff5540b0be28064b9002c101ef289',
      'coins[]': 'btc',
    }
  }).then((res) => {
    const data = JSON.parse(res);
    const price = data.btc[3].price + 0.95;
    const qty = data.btc[3].qty;
    const coinmamaBtcUsd = price/qty;
    localStorage.setItem('values/coinmama_btc_usd', coinmamaBtcUsd.toFixed(2));
  }).catch((err) => {
    console.log('Error fetching coinmama btc', err);
  });
}

function fetchCmktEthSell() {
  return request({
    method: 'GET',
    url: 'https://www.cryptomkt.com/api/ethclp/1440.json',
    headers: { 
      'Postman-Token': 'f4f68dc9-484d-0455-d253-4413cde4faec',
      'Cache-Control': 'no-cache',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const cmktEthSell = data.data.prices_ask.values[0].close_price;
    localStorage.setItem('values/cmkt_eth_sell', cmktEthSell);
  }).catch((err) => {
    console.log('Error fetching cmkt eth sell', err);
  });
}

function fetchCmktEthBuy() {
  return request({
    method: 'GET',
    url: 'https://www.cryptomkt.com/api/ethclp/1440.json',
    headers: { 
      'Postman-Token': 'f4f68dc9-484d-0455-d253-4413cde4faec',
      'Cache-Control': 'no-cache',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const cmktEthBuy = data.data.prices_bid.values[0].close_price;
    localStorage.setItem('values/cmkt_eth_buy', cmktEthBuy);
  }).catch((err) => {
    console.log('Error fetching cmkt eth buy', err);
  });
}

function fetchBudaBtc() {
  return request({
    method: 'GET',
    url: 'https://www.buda.com/api/v2/markets/BTC-CLP/ticker',
    headers: {
      'Postman-Token': 'd853d12e-c035-b96e-3acf-91e6d5d0f268',
      'Cache-Control': 'no-cache',
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' },
    }
  ).then((res) => {
    const data = JSON.parse(res);
    const budaBtcSell = parseInt(data.ticker.min_ask[0]);
    const budaBtcBuy = parseInt(data.ticker.max_bid[0]);
    localStorage.setItem('values/buda_btc_sell', budaBtcSell);
    localStorage.setItem('values/buda_btc_buy', budaBtcBuy);
  }).catch((err) => {
    console.log('Error fetching buda btc', err);
  });
}

function fetchGdaxBtc() {
  return request({
    method: 'GET',
    url: 'https://api.gdax.com/products/BTC-USD/trades',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const gdaxBtc = parseInt(data[0].price);
    localStorage.setItem('values/gdax_btc', gdaxBtc);
  }).catch((err) => {
    console.log('Error fetching gdax btc', err);
  });
}

function fetchGdaxEth() {
  return request({
    method: 'GET',
    url: 'https://api.gdax.com/products/ETH-USD/trades',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    },
  }).then((res) => {
    const data = JSON.parse(res);
    const gdaxEth = parseInt(data[0].price);
    localStorage.setItem('values/gdax_eth', gdaxEth);
  }).catch((err) => {
    console.log('Error fetching gdax eth', err);
  });
}

function fetchSpank() {
  return request({
    method: 'GET',
    url: 'https://coinmarketcap.com/currencies/spankchain/'
  }).then((res) => {
    const $ = cheerio.load(res);
    const spank = $('#quote_price').attr('data-usd');
    const spankPerc = $('#quote_price+span span').html();
    localStorage.setItem('values/spank', spank);
    localStorage.setItem('values/spank_perc', spankPerc);
  }).catch((err) => {
    console.log('Error fetching spank', err);
  });
}

function fetchUsdClp() {
  return request({
    method: 'GET',
    url: 'http://www.xe.com/es/currencyconverter/convert/?From=USD&To=CLP'
  }).then((res) => {
    const $ = cheerio.load(res);
    const usdClp = $('#ucc-container .uccResultAmount').html();
    localStorage.setItem('values/usd_clp', parseInt(usdClp) + USD_CLP_OFFSET);
  }).catch((err) => {
    console.log('Error fetching usd clp', err);
  });
}