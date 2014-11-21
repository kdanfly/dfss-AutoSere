var baseUrl = "/Ajax/StuHdl.ashx";
var data = {"loginType": "2",
            "method": "Browser",
            "stuid": "31003550",//学员编号, 换人需更改
            "lessonid": "001",//训练阶段, 根据实际情况选择[散段:001;桩训002;综合训练007;考前路训:008]
            "cartypeid": "01",
            "carid": ""
             };
//自定义时间段(1-5)
var CUSTOMTIME = 5;
//刷新间隔基数(分钟)
var INTERVAL = 1.6;

//请求查询, 以获取当前可约状态
function queryState(){
   
  console.log("查询车辆可约状态中...")
  $.post(baseUrl, data, function(result){

      //console.log(result);
      var effectPeriod = resolveData(result);
      var customTime = CUSTOMTIME;

      var key=0;
      var date="";

      if(effectPeriod.key.length > 0){

           for (var i=0; i<effectPeriod.key.length && key != customTime; i++){
                key = effectPeriod.key[i] * 1 == customTime ? customTime : 0;
                date = effectPeriod.date[i];
               }

           var s ;
           var e ;

           switch(key)
           {
           case 1:
             s = "7";e = "9";
             break;
           case 2:
             s = "9";e = "13";
             break;
           case 3:
             s = "13";e = "17";
             break;
           case 4:
             s = "17";e = "19";
             break;
           case 5:
             s = "19";e = "21";
             break;
           default:
             s = "";e = "";
           }

              var d = new Date();
              var isToday = d.toLocaleDateString().replace(/\//,"-").replace(/\//,"-") == date ? true : false;
           if(isToday){
         
                console.warn("今天可约,可惜! 继续查询...");
                reQuery();
              
           }
           if(s != ""){

                console.info("刷到了! 自动提交, 希望能抢到!");
                submitData(s,e,date);
                
           }else{

           		//x秒后重新查询
  		reQuery();
      	   }
      }else{
           //x秒后重新查询
           reQuery();
      }
  });
}
queryState();
//解析查询结果
function resolveData(result){

     var schedule = result.substring(result.indexOf(']||') + 3);
     var obj = eval ("(" + schedule + ")");
     //var effectPeriodID = [];
     var effectPeriodDate = [];
     var effectPeriodKey = [];

     var effectPeriod = new Object();

     //遍历结果JSON, 查找并返回可预订时间段
     for(var i=0, l=obj.length; i<l; i++){
          for(var key in obj[i]){
             
               if(obj[i][key].indexOf("\/") > 0 && obj[i][key].substring(obj[i][key].indexOf("\/") + 1) > 0){
                    console.table(
                              "日期:"+ obj[i]["fchrdate"] +
                              " |时段:"+ key +
                              " |剩余人数:" + obj[i][key].substring(obj[i][key].indexOf("\/") + 1)
                              );
                    //effectPeriodID.push(obj[i][key].substring(0,3));
                    effectPeriodDate.push(obj[i]["fchrdate"].substring(0,10));
                    effectPeriodKey.push(key);
               }
               //console.log(obj[i][key]+" | i:"+ i +" |key:"+ key);
          }
     }

     effectPeriod.key = effectPeriodKey;
     effectPeriod.date = effectPeriodDate;
 
     //console.log(obj);
     //console.log("effectPeriodID:"+ effectPeriodID +" |effectPeriodDate:"+effectPeriodDate+" |effectPeriodKey:"+effectPeriodKey);

     return effectPeriod;
}

//如果可约, 则提交约车数据
function submitData(s,e,selected){

     //基础数据
     var fchrStudentID = $("#fchrStudentID").val();
     var bmnum = $("#fchrRegistrationID").val();
     var lesstypeid = $("#fchrLessonTypeID").val();
     var id = "1";//0,自选车号;1,随机分配
     var carid = "";
     var ycmethod = "03";
     var cartypeid = "01";
     var trainsessionid = "05";//课程时段ID
     var ReleaseCarID = "";

     //选课数据
     var start = s;
     var end = e;
     var selecteddate = selected;

     $.ajax({
          type: "post",
         cache: false,
         url: "/Ajax/StuHdl.ashx?loginType=2&method=yueche&stuid="
         + fchrStudentID + "&bmnum=" + bmnum
         + "&start=" + start + "&end=" + end + "&lessionid=" + $("input:radio:checked").attr("id")
         + "&trainpriceid=" + $("#fchrTrainPriceID").val() + "&lesstypeid=" + lesstypeid
         + "&date=" + selecteddate + "&id=" + id + "&carid=" + carid + "&ycmethod=" + ycmethod + "&cartypeid="
         + cartypeid + "&trainsessionid=" + trainsessionid + "&ReleaseCarID=" + ReleaseCarID,
         success: function (data) {
             if (data == "Timeout") {
                 console.warn("警告", "当天约车已经超过6小时！", "warning");
                 return;
             }
             if (data == "agotime") {
                 console.warn("警告", "不能预约以前的车辆！", "warning");
                 return;
             }
             if (data == "saverror") {
                 console.error("错误", "数据保存错误！", "error");
                 return;
             }
             if (data == "error") {
                 console.warn("错误,读取放车信息出错！");
                 return;
             }
             if (data == "overtotal") {
                 console.warn("警告,所约学时超出总学时！");
                 return;
             }
             if (data == "todayhave") {
                console.warn("警告,已经越过此时段车！");
                 return;
             }
             if (data == "totalstudyerror") {
                 console.error("错误,找不到学时信息！");
                 return;
             }
             if (data == "success") {
                  console.debug("约车成功!"+ selecteddate +" "+ s +"-"+ e);
                 $("#BTNFind").triggerHandler("click");
             }
             else {
                 console.error("可惜, 没抢到! 服务器这么说:" + data);
                 reQuery();
             }
         }
     });
}

//如果不可约, 则等待X分钟后自动刷新(避免因访问频繁而踢出系统)
function reQuery(){
  //x毫秒后重新查询
  var x = INTERVAL * 60000 * (1 + Math.random());
  console.log("无合适车辆, " + (x/60000).toFixed(2) + "分钟后重试!");
  var t = setTimeout("queryState()",x);
}

//页面动态显示刷新状态