
/*

below code is used to take a function and apply the promise or async await to process the function

 */
const asyncHandler  = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next))
        .catch((err) => next(err))
        
    }
}
export {asyncHandler}


// another way to do it with async await
/*
const asyncHandler = (fn) => async(req,resp,next) => {
    try {
        await fn(eq,resp,next)
    } catch (error) {
        resp.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}
*/


