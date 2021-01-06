const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const url = require('url');
let {port,dir_path,enable_log} = JSON.parse(fs.readFileSync('./config.json',{encoding:'utf8'}));
dir_path = trimEndSlash(dir_path);

function trimEndSlash (path) //remove excess '/'
{
    var targ = path.length;
    for(var i = path.length-1;i>=0;i--)
    {
        if(path[i] == '/')
            targ = i;
        else
            break;
    }
    return path.substr(0,targ);
}
function log(txt){
    if(enable_log)console.log(`[${(new Date).toLocaleString()}]:${txt}`);
}
function craftHTML(body){
    return `<head>
    <style>
    body{
        background-color:black;
        font-family: Consolas, monaco, monospace;
    }
    .dir{
        font-size: larger;
        color:cyan
    }
    .file{
        font-size: larger;
        color:greenyellow
    }
    .error{
        font-size: larger;
        color:red;
        text-align:center;
    }
    </style>
    </head><body>`+body+'</body>'
}

const server = http.createServer((req, res) => {
    if(req.method == 'GET')
    {
        //scan all files in dir_path
        let rawPath = querystring.unescape(url.parse(req.url).pathname);
        let requested = trimEndSlash(rawPath);
        let target = dir_path+requested;
        if(fs.existsSync(target))//exist
        {
            if(fs.lstatSync(target).isDirectory())//serve list
            {
                fs.readdir(target,(err,files)=>{
                    let html = '';
                    let html2 = '';
                    for(var name of files)
                    {
                        var full = target+'/'+name;
                        if(fs.existsSync(full))
                            if(fs.lstatSync(full).isDirectory())
                                html += `<a class="dir" href="${requested}/${name}">${name}</a><br>`;
                            else
                                html2 += `<a class="file" download href="${requested}/${name}">${name}</a><br>`;
                    }
                    res.setHeader('content-type','text/html; charset=UTF-8');   //fix latin error
                    res.write(craftHTML(html+html2));
                    res.end();
                    log(rawPath);
                });
            }
            else//serve file
            {
                let info = `serve ${requested} for ${req.connection.remoteAddress} `;
                let stream = fs.createReadStream(target, { bufferSize: 64 * 1024 });
                stream.pipe(res);
                stream.on('close',()=>{
                    log(info+'success.')
                }).on('error',()=>{
                    log(info+'failed.')
                })
            }
        }
        else //404 not found
        {
            if(requested == ""){
                res.statusCode = 404;
                log("Invalid 'dir_path'. Check config.json");
            }
            else{
                res.write(craftHTML(`
                <div style="text-align:center;">
                    <p class="error">404 not found</p>
                    <a class="error" href="/">go back</a>
                </div>
                `));
                log(requested +" not exists.");
            }
            res.end();
        }
    }
});
server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
server.listen(port,()=>{
    console.log(`server started! http://localhost:${port}`);
})