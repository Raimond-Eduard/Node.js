const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const cookieParser=require('cookie-parser');
const port = 6789;
const app = express();
const rateLimit = require('express-rate-limit');

const session = require('express-session');

const failedRequests = {};

const blockIP = (req, res, next) => {
	const ip = req.ip;

	if (failedRequests[ip] && failedRequests[ip].blocked) {
		const timeLeft = (failedRequests[ip].blockUntil - Date.now()) / 1000;
		if (timeLeft > 0) {
		return res.status(403).send(`Your IP is temporarily blocked. Try again in ${timeLeft.toFixed(0)} seconds.`);
		} else {
		delete failedRequests[ip]; // Unblock IP after the block duration has passed
		}
	}

	next();
};

const logNonExistentRoutes = (req, res, next) => {
	const ip = req.ip;
	if (!failedRequests[ip]) {
	  failedRequests[ip] = { attempts: 0, blocked: false, blockUntil: 0 };
	}
  
	failedRequests[ip].attempts += 1;
  
	if (failedRequests[ip].attempts >= 3) {
	  failedRequests[ip].blocked = true;
	  failedRequests[ip].blockUntil = Date.now() + 30000; // Block pentru 30 
	}
  
	next();
  };
  

app.set('view engine', 'ejs');

app.use(cookieParser())
app.use(expressLayouts);
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(blockIP);



app.use(session({
	secret:'secret',
	resave:false,
	saveUninitialized:false,
	cookie:{
	maxAge:null
	}}));
app.get('/', (req, res) => {
	res.clearCookie('mesajEroare');
	var produse = null;
	if(req.cookies['produse'] != null){
		produse = req.cookies['produse'];
	}
	if(req.cookies["utilizator"]){
		res.render('index', {utilizator: req.cookies["utilizator"],
							
							produse: produse});
	}
	else{
		res.render('index', {utilizator : undefined,
							
							produse : undefined});
	}
		
});

app.get('/chestionar', (req, res) => {
	
	let utilizator = req.session.numeLogat
	res.render('chestionar', {intrebari: listaIntrebari,utilizator:utilizator});
});

const fs = require('fs');

var data = fs.readFileSync('intrebari.json');
listaIntrebari = JSON.parse(data);

app.post('/rezultat-chestionar', (req, res) => {
	console.log(req.body);
	fs.readFile('intrebari.json', (err, data) => {
		var nr = 0;
		var i = 0;
		for (i in req.body) {
			console.log(listaIntrebari[parseInt(i.substring(1))].corect);
			if (req.body[i] == listaIntrebari[parseInt(i.substring(1))].corect) {
				nr++;
			}
		}
		console.log('Corecte:' + nr);
		let utilizator = req.session.numeLogat;
		res.render('rezultat-chestionar', { raspunsuri: nr, utilizator: utilizator});
	});
});

app.get('/autentificare', (req, res) => {
	res.render('autentificare',{mesajEroare: req.cookies.mesajEroare, utilizator: null});
});


app.post('/verificare-autentificare', (req, res, next) => {
	fs.readFile('utilizatori.json',(err,data) => {
		
		if(err) throw err;
		console.log("Verificare Autentificare");
		console.log(req.body);
		
		var users=JSON.parse(data);
		var i=0;
		let ok=0;
		
		for(i in users.utilizatori) {
			if(req.body.unameN === users.utilizatori[i].user && req.body.pnameN === users.utilizatori[i].parola)
			{
				ok=1;
				req.session.rol = users.utilizatori[i].rol;
				
			}
			console.log(ok);
		}
		if(ok ==0){
			
			console.log("Numele utilizatorului sau parola sunt greșite!");
			
			res.cookie('mesajEroare','Numele utilizatorului sau parola sunt greșite!',{maxAge:1*60000});
			res.clearCookie("utilizator");
			res.redirect('/autentificare');
			
		}
		else{
			console.log("Autentificare corectă!");

			req.session.numeLogat = req.body.unameN;

			console.log(req.session.numeLogat);
		
			res.cookie('utilizator', req.body.unameN,{maxAge:2*60000});

			res.redirect("/");
		}
	});


});
app.get('/logout', (request, response, next) => {
    response.clearCookie('utilizator');
	request.session.destroy();
    response.redirect('/');
});

app.get('/creare-bd', (req, res) => {
	const sqlite3 = require('sqlite3').verbose();
  
	let db = new sqlite3.Database('./db/cumparaturi.db', (err) => {
	  if (err) {
		console.error('Error connecting to the database:', err.message);
		return res.status(500).send('Database connection error');
	  }
	  console.log("Successfully connected to the database");
	});
  
	let statement = `CREATE TABLE IF NOT EXISTS produse (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  nume TEXT NOT NULL,
	  specificatii TEXT NOT NULL
	);`;
  
	db.run(statement, (err) => {
	  if (err) {
		console.error('Error creating table:', err.message);
		return res.status(500).send('Error creating table');
	  }
	  console.log("Table has been created successfully or already exists");
	});
  
	db.close((err) => {
	  if (err) {
		console.error('Error closing the database:', err.message);
		return res.status(500).send('Error closing database');
	  }
	  console.log('Database connection closed');
	});
  
	res.redirect('/');
  });
  

app.get('/inserare-bd', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();

  let products = [
    ['Nvidia RTX 3050 Ti', '1 000 lei'],
    ['RAM DDR4 32GB 3200MHz', '560 lei'],
    ['AMD Ryzen 5 5600X', '1 200 lei'],
    ['MSI B450 TOMAHAWK MAX', '500 lei'],
    ['Samsung 970 EVO Plus 1TB NVMe', '600 lei'],
    ['Corsair RM750x 750W', '450 lei'],
    ['NZXT H510', '350 lei'],
    ['Cooler Master Hyper 212 RGB', '200 lei'],
    ['Seagate Barracuda 2TB 7200RPM', '300 lei'],
    ['Noctua NF-A12x25 PWM (2 bucăți)', '200 lei']
];
  let db = new sqlite3.Database('./db/cumparaturi.db', (err) => {
    if(err){
      console.log(err.message);
    }
    console.log("Conectat la baza de date cu succes (insertion)");
  });
  
  let sqlStatement = `INSERT INTO produse (nume, specificatii) VALUES (?, ?);`;

  db.serialize(() => {
    let stmt = db.prepare(sqlStatement);
    products.forEach(produs => {
      stmt.run(produs, (err) => {
        if (err) {
          console.error('Error inserting data:', err.message);
        } else {
          console.log('Insert successful');
        }
      });
    });
    stmt.finalize();
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });

  res.redirect('/');
});


app.get('/afisare-produse', (req, res) => {

  var sqlite = require('sqlite3');

  let db = new sqlite.Database('./db/cumparaturi.db');

  console.log("Conectat la baza de date");

  var statement = "SELECT * FROM produse";

  db.all(statement, [], (err, rows) =>{
    if(err){
      throw err;
    }
    console.log("Succes la extragere din baza de date");
    res.cookie('produse', rows);
    res.redirect('/');
    
  });

  db.close();
});

app.post('/adaugare-cos', (req, res) => {
	console.log("Incercam adaugarea produsului cu id [" + req.body.id + "] în coș!");
  
  if(req.session.cos_cumparaturi === undefined) {
  	req.session.cos_cumparaturi = [];
  }

	req.cookies['produse'].forEach(produs =>{
		if(produs.id == req.body.id){
			var status = false;
			req.session.cos_cumparaturi.forEach(sessionProduct =>{
				if(sessionProduct.id == produs.id){
					//console.log('Produsul exista deja în coș!')
					req.session.cos_cumparaturi.push(produs);
					status = true;
				}
			});
		if(status == false){
			req.session.cos_cumparaturi.push(produs);
		}
	}

	});

	console.log(req.session.cos_cumparaturi);
	res.redirect('/');

});

app.get('/vizualizare-cos', (req, res) =>{
	let utilizator = req.session.numeLogat;
	res.render('vizualizare-cos', {produse:req.session.cos_cumparaturi, utilizator: utilizator});
});

//admin
app.get('/admin', (req, res) => {
	console.log(req.session.rol);
	if(req.session && req.session.rol === 'admin')
	{
		res.render('admin', { utilizator: "admin"});
	}
	else{
		res.redirect('/');
	}
});



app.post('/adaugare-produs', (req, res) => {
	var sqlite = require('sqlite3');

  let db = new sqlite.Database('./db/cumparaturi.db');

  console.log("Conectat la baza de date");

	

  console.log("Conectarea realizată cu succes!");
  console.log(req.body.nume);
  console.log(req.body.specificatii );
  var sql = 'INSERT INTO cumparaturi.produse (nume, specificatii) VALUES (' + req.body.nume + ',' + req.body.specificatii  + ')';

  db.run(sql, function (err, result) {
    if (err) {
      if(err.code == 'ERR_DUP_ENTRY'){
        console.log("Inregistrarea exista deja");
      }
      else{
        console.log("Eroare la inserare!" + err.code);
      }
    }
    else{
      console.log("Inserare cu succes");
    }
  });
	res.redirect('/');
});

//securitate

app.use('*', logNonExistentRoutes, (req, res) => {
	res.status(404).send("Resursa nu a fost gasita");
});
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));