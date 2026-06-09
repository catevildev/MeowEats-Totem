fetch('http://127.0.0.1:6005/api/pedidos?data=2026-06-08').then(r=>r.json()).then(d=>console.log("Count:", d.length));
