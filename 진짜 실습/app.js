const express=require('express');
const {MongoClient,ObjectId} =require('mongodb')
const bodyParaser = require('body-parser')
const dotenv = require('dotenv')
const path = require('path')

//앱 초기화
const app = express();
const port = process.env.PORT||3000;

//ejs 엔진 설정
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'))

//미들웨어 설정
app.use(bodyParaser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

//mongodb연결하는 부분을 적어봅시다
dotenv.config();
let db;
const url = process.env.MONGO_URL;

new MongoClient(url).connect().then((client)=>{
    console.log("디비 연결 성공")
    db=client.db('forum')

    //db 연결후 시작하는 서버코드
    app.listen(port,()=>{
        console.log(`서버가 ${port}에서 실행되고있습니다`);
    })
}).catch((err)=>{
    console.log(err);
})

//미들웨어 : db객체 접근을 위해서 등록을 합니다.
app.use((req,res,next)=>{
    req.db=db;
    next()
})


app.get('/',async (요청,응답)=>{
    try{
        const posts= await db.collection('posts').find().sort({date:-1}).toArray();
        응답.render('list',{posts});
    }catch(err){
        console.error('게시글 조회 오류');
        응답.status(500).send('서버 오류가 발생했습니다');
    }
})

app.get('/write',(요,응)=>{
    응.render("write")
})

app.post('/add',async (요청,응답)=>{
    try{
        const {title,content}=요청.body;
        const post={
            title,
            content,
            date:new Date()
        }
        await db.collection('posts').insertOne(post);
        응답.redirect('/'); //get /작동을 한다.
    }catch(err){
        console.error("게시글 저장하는데에서 오류가 발생했습니다");
        res.status(500).send('서버 오류가 발생했습니다.');
    }
})

//수정하는 부분
app.get('/detail/:id',async (요청,응답)=>{
    try{
        const post= await db.collection("posts").findOne({_id:new ObjectId(요청.params.id)});
        if(!post){
            return 응답.status(404).send("게시글을 찾을 수 없습니다");
        }
        응답.render('detail',{post})
    }catch(err){
        console.error('게시글 자세히 보는중 이상한 오류뜸');
        응답.status(500).send('서버 오류가 발생했습니다');
    }
})

//수정하는 부분
app.get('/edit/:id',async (요청,응답)=>{
    try{
        const post= await db.collection("posts").findOne({_id:new ObjectId(요청.params.id)});
        if(!post){
            return 응답.status(404).send("게시글을 찾을 수 없습니다");
        }
        응답.render('edit',{post})
    }catch(err){
        console.error('게시글 자세히 보는중 이상한 오류뜸');
        응답.status(500).send('서버 오류가 발생했습니다');
    }
})

//수정을 처리하는 로직
app.post('/update/:id',async (요청,응답)=>{
    try{
        const {title,content}=요청.body;
        await db.collection('posts').updateOne(
            {_id:new ObjectId(요청.params.id)},
            {$set:{title,content}}
        );
        응답.redirect('/detail/'+요청.params.id);
    }catch(err){
        console.error(err)
    }
})

//삭제 처리
app.post('/delete/:id',async (요청,응답)=>{
    try{
        await db.collection('posts').deleteOne(
            {_id:new ObjectId(요청.params.id)},
        );
        응답.redirect('/');
    }catch(err){
        console.error(err)
    }
})


app.use((요청,응답)=>{
    응답.status(404).send('페이지를 찾을수없습니다')
})