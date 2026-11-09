

# ApiKeysRevoke404Response

## anyOf schemas
* [ApiKeyNotFoundEncoded](ApiKeyNotFoundEncoded.md)
* [WorkspaceNotFoundEncoded](WorkspaceNotFoundEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.ApiKeysRevoke404Response;
import social.peal.model.ApiKeyNotFoundEncoded;
import social.peal.model.WorkspaceNotFoundEncoded;

public class Example {
    public static void main(String[] args) {
        ApiKeysRevoke404Response exampleApiKeysRevoke404Response = new ApiKeysRevoke404Response();

        // create a new ApiKeyNotFoundEncoded
        ApiKeyNotFoundEncoded exampleApiKeyNotFoundEncoded = new ApiKeyNotFoundEncoded();
        // set ApiKeysRevoke404Response to ApiKeyNotFoundEncoded
        exampleApiKeysRevoke404Response.setActualInstance(exampleApiKeyNotFoundEncoded);
        // to get back the ApiKeyNotFoundEncoded set earlier
        ApiKeyNotFoundEncoded testApiKeyNotFoundEncoded = (ApiKeyNotFoundEncoded) exampleApiKeysRevoke404Response.getActualInstance();

        // create a new WorkspaceNotFoundEncoded
        WorkspaceNotFoundEncoded exampleWorkspaceNotFoundEncoded = new WorkspaceNotFoundEncoded();
        // set ApiKeysRevoke404Response to WorkspaceNotFoundEncoded
        exampleApiKeysRevoke404Response.setActualInstance(exampleWorkspaceNotFoundEncoded);
        // to get back the WorkspaceNotFoundEncoded set earlier
        WorkspaceNotFoundEncoded testWorkspaceNotFoundEncoded = (WorkspaceNotFoundEncoded) exampleApiKeysRevoke404Response.getActualInstance();
    }
}
```


