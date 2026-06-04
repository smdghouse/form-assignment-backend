let wss = null;
const setWSS =(websocket)=>{
    wss = websocket
}
const getWSS = ()=>{
    return wss
}
module.exports ={
    setWSS,
    getWSS
}