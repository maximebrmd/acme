

# MediaGet404Response

## anyOf schemas
* [MediaNotFoundEncoded](MediaNotFoundEncoded.md)
* [WorkspaceNotFoundEncoded](WorkspaceNotFoundEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.MediaGet404Response;
import social.peal.model.MediaNotFoundEncoded;
import social.peal.model.WorkspaceNotFoundEncoded;

public class Example {
    public static void main(String[] args) {
        MediaGet404Response exampleMediaGet404Response = new MediaGet404Response();

        // create a new MediaNotFoundEncoded
        MediaNotFoundEncoded exampleMediaNotFoundEncoded = new MediaNotFoundEncoded();
        // set MediaGet404Response to MediaNotFoundEncoded
        exampleMediaGet404Response.setActualInstance(exampleMediaNotFoundEncoded);
        // to get back the MediaNotFoundEncoded set earlier
        MediaNotFoundEncoded testMediaNotFoundEncoded = (MediaNotFoundEncoded) exampleMediaGet404Response.getActualInstance();

        // create a new WorkspaceNotFoundEncoded
        WorkspaceNotFoundEncoded exampleWorkspaceNotFoundEncoded = new WorkspaceNotFoundEncoded();
        // set MediaGet404Response to WorkspaceNotFoundEncoded
        exampleMediaGet404Response.setActualInstance(exampleWorkspaceNotFoundEncoded);
        // to get back the WorkspaceNotFoundEncoded set earlier
        WorkspaceNotFoundEncoded testWorkspaceNotFoundEncoded = (WorkspaceNotFoundEncoded) exampleMediaGet404Response.getActualInstance();
    }
}
```


