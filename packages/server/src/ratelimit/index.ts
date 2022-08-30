export default class RateLimit {
    duration: number;
    database: any;

    constructor(duration){
        this.duration = duration;
        this.database = Object.create(null);
    }

    shouldRateLimit(ip: string, methodName: string, total: number): boolean{
        this.precheck(ip, methodName, total);
        //check if ip is in database
            //if not add it to database
        
        if (!this.shouldReset(ip)){
            if(this.checkRemaining(ip, methodName)){
                this.decreaseRemaining(ip, methodName);
                console.log(this.database[ip]);
                return false;
            }
            return true;
        }else{
            this.reset(ip, methodName, total);
            this.decreaseRemaining(ip, methodName);
            console.log(this.database[ip]);
            return false;
        }
        //check remaining requests and limit, 
            //if remaining is 0 and limit is not yet reached, should rate limit, 
            //if remaining is 0 and limit is reached, should reset and not rate limit
            //if remainig is more than 0 and limit is not yet reached, should not rate limit
    }

    private precheck(ip: string, methodName: string, total: number){
        if (!this.checkIpExist(ip)){
            this.setNewIp(ip);
        }

        if (!this.checkMethodExist(ip, methodName)){
            this.setNewMethod(ip, methodName, total);
        }
    }

    private setNewIp(ip: string){
        const entry: DatabaseEntry = {
            reset: Date.now() + this.duration,
            methodInfo: {}
        }
        this.database[ip] = entry;
    }

    private setNewMethod(ip: string, methodName: string, total: number){
        const entry: MethodDatabase = {
            methodName: methodName,
            remaining: total
        }
        this.database[ip].methodInfo[methodName] = entry;
    }

    private checkIpExist(ip: string): boolean{
        return this.database[ip] !== undefined ? true : false ;
    }

    private checkMethodExist(ip: string, method: string): boolean{
        return this.database[ip].methodInfo[method] !== undefined ? true : false ;
    }

    private checkRemaining(ip: string, methodName: string): boolean{
        return this.database[ip].methodInfo[methodName].remaining > 0 ? true : false;
    }

    private shouldReset(ip: string): boolean{
        return this.database[ip].reset < Date.now() ? true : false;
    }
    
    private reset(ip: string, methodName: string, total: number){
        this.database[ip].reset = Date.now() + this.duration;
        this.database[ip].methodInfo[methodName].remaining = total;
    }

    private decreaseRemaining(ip: string, methodName: string){
        let remaining = this.database[ip].methodInfo[methodName].remaining > 0 ?
        this.database[ip].methodInfo[methodName].remaining - 1
        : 0;

        this.database[ip].methodInfo[methodName].remaining = remaining
    }
}

interface DatabaseEntry {
    reset: number;
    methodInfo: any;
}

interface MethodDatabase {
    methodName: string;
    remaining: number;
}