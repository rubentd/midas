const INTERVAL = 20000;

$(document).ready( function() {

	fetchValues();
	setInterval(function(){
		fetchValues();
	}, INTERVAL);

});


function fetchValues(){
	$.get('/values/', function(data){
		$('#btc').html(data.btc);
		$('#eth').html(data.eth);
		$('#btc-eth').html(data.btcEth);
		$('#arbitrage1').html(data.arbitrage1);

		if(data.arbitrage1.indexOf('-') < 0){
			$('#arbitrage1').removeClass('negative').addClass('positive');			
		}else{
			$('#arbitrage1').removeClass('positive').addClass('negative');	
		}
	});
}