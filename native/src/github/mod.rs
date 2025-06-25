use neon::prelude::*;

// Placeholder implementations for now - will be implemented in Phase 3
pub fn create_chat_completions(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let (deferred, promise) = cx.promise();
    
    // For now, return a placeholder response
    deferred.settle_with(&cx.channel(), move |mut cx| {
        let result = cx.string("{\"placeholder\": \"chat_completions_not_implemented\"}");
        Ok(result)
    });
    
    Ok(promise)
}

pub fn create_embeddings(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let (deferred, promise) = cx.promise();
    
    deferred.settle_with(&cx.channel(), move |mut cx| {
        let result = cx.string("{\"placeholder\": \"embeddings_not_implemented\"}");
        Ok(result)
    });
    
    Ok(promise)
}

pub fn get_models(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let (deferred, promise) = cx.promise();
    
    deferred.settle_with(&cx.channel(), move |mut cx| {
        let result = cx.string("{\"placeholder\": \"models_not_implemented\"}");
        Ok(result)
    });
    
    Ok(promise)
}