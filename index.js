var express = require('express');
var formatCurrency = require('format-currency')
var axios = require('axios');
var cheerio = require('cheerio');
var app = express();
var twilio = require('twilio');
var path = require('path');
var qs = require('qs');
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./local-storage');
var public = __dirname + "/www/";

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const PORT = process.env.PORT || 8082;
const phoneNumbers = process.env.NUMBERS;
const ALERT_AMOUNT = parseInt(process.env.ALERT_AMOUNT);
const INTERVAL = 10 * 60 * 1000;// check every 10 min
var client = new twilio(accountSid, authToken);

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(public + "index.html"));
});

app.use('/', express.static(public));

app.get('/values/', function(req, res) {
	getValues(res);
});

app.listen(PORT);

getValues();
setInterval(getValues, INTERVAL)


function getValues(res){
	var btcCLP, ethCLP, clpETH, btcEth, btcUSD, btcUSDPerc, ethUSD, ethUSDPerc;
  
  var p1Options = {
    method: 'POST',
    url: 'https://www.surbtc.com/api/v2/markets/btc-clp/quotations',
    data: { 
      type: 'bid_given_earned_base',
      amount: [1,'BTC'],
      market_id: null
    },
    headers: {
        'Accept':'application/json',
        'Accept-Encoding' : 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.8,es;q=0.6,pt;q=0.4,gl;q=0.2,nb;q=0.2',
        'Cache-Control':'no-cache',
        'Connection':'keep-alive',
        'Content-Length':'68',
        'Content-Type':'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    },
    json: true
  };

	var p1 = axios(p1Options)
  	.then(function (response) {
  		btcCLP = response.data.quotation.quote_exchanged[0];
    }).catch(function (error) {
    	console.log(error);
  	});

    var p2 = axios.get('https://www.surbtc.com/api/v2/markets/btc-clp/ticker')
    .then(function (response) {
      btcCLPSell = response.data.ticker.last_price[0];
    }).catch(function (error) {
      console.log(error);
    });

  	var p3 = axios.get('https://www.cryptomkt.com/api/ethclp/1440.json')
  	.then(function (response) {
  		ethCLP = response.data.data.prices_bid.values[0].close_price;
      clpETH = response.data.data.prices_ask.values[0].hight_price;
  	}).catch(function (error) {
    	console.log(error);
  	});

  	var p4 = axios.get('http://ether.price.exchange/update')
  	.then(function (response) {

      btcEth = (1/response.data.last).toFixed(2);

  	}).catch(function (error) {
    	console.log(error);
  	});

    var p5 = axios.get('https://coinmarketcap.com/currencies/ethereum/')
    .then(function (response) {
      
      $ = cheerio.load(response.data);
      ethUSD = $('#quote_price').html().replace('$', '');
      ethUSDPerc = $('#quote_price+span').html().replace('(', '').replace(')', '').replace('%', '');


    }).catch(function (error) {
      console.log(error);
    });

    
    var p6 = axios.get('https://coinmarketcap.com/currencies/bitcoin/')
    .then(function (response) {
      
      $ = cheerio.load(response.data);
      btcUSD = $('#quote_price').html().replace('$', '');
      btcUSDPerc = $('#quote_price+span').html().replace('(', '').replace(')', '').replace('%', '');


    }).catch(function (error) {
      console.log(error);
    });


  	Promise.all([p1, p2, p3, p4, p5, p6]).then((values) => { 

      var surBTCFee = (btcCLP * 0.007);
  		var arbitrage1 = (btcEth * ethCLP - btcCLP) - surBTCFee;
      var arbitrage2 = (btcCLP - (btcEth * clpETH)) - surBTCFee;

      if(res){
        // Respond requests
        res.send({
            btcUSD: formatCurrency(btcUSD),
            btcUSDPerc: btcUSDPerc,

            ethUSD: formatCurrency(ethUSD),
            ethUSDPerc: ethUSDPerc,

            btcCLP: formatCurrency(btcCLP),
            btcCLPSell: formatCurrency(btcCLPSell),

            ethCLP: formatCurrency(ethCLP),

            clpETH: formatCurrency(clpETH),

            btcEth: btcEth,

            arbitrage1: formatCurrency(arbitrage1),
            arbitrage2: formatCurrency(arbitrage2),
        });
      }else{
        // Send alerts
        if(arbitrage1 > 0 && (parseFloat(arbitrage1) > ALERT_AMOUNT)){
          sendAlert(arbitrage1);
        }

        if(arbitrage2 > 0 && (parseFloat(arbitrage2) > ALERT_AMOUNT)){
          sendAlert(arbitrage2);
        }
      }
	});

}

function sendAlert(amount){
  var d = new Date();
  var currentDate = d.getDate() +'/'+ (d.getMonth()+1) +'/'+ (d.getFullYear());
  lastAlert = localStorage.getItem('last-alert');

  if(!lastAlert || lastAlert != currentDate){ // only one alert per day

    // Send new alert

    localStorage.setItem('last-alert', currentDate);

    phoneNumbers.split(',').forEach((n) => {
      console.log('Sending alert to: ' + n + ' Date:' + currentDate);
      client.messages.create({
        body: 'Midas alert: ' + formatCurrency(amount),
        to: n,
        from: twilioNumber
      })
      .then((message) => console.log('message id: ' + message.sid)); 
    });
  
  }else{
    console.log('already sent an alert today: ' + lastAlert);
  }
}