

# ChannelsCompleteConnect404Response

## anyOf schemas
* [ChannelNotFoundEncoded](ChannelNotFoundEncoded.md)
* [WorkspaceNotFoundEncoded](WorkspaceNotFoundEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.ChannelsCompleteConnect404Response;
import social.peal.model.ChannelNotFoundEncoded;
import social.peal.model.WorkspaceNotFoundEncoded;

public class Example {
    public static void main(String[] args) {
        ChannelsCompleteConnect404Response exampleChannelsCompleteConnect404Response = new ChannelsCompleteConnect404Response();

        // create a new ChannelNotFoundEncoded
        ChannelNotFoundEncoded exampleChannelNotFoundEncoded = new ChannelNotFoundEncoded();
        // set ChannelsCompleteConnect404Response to ChannelNotFoundEncoded
        exampleChannelsCompleteConnect404Response.setActualInstance(exampleChannelNotFoundEncoded);
        // to get back the ChannelNotFoundEncoded set earlier
        ChannelNotFoundEncoded testChannelNotFoundEncoded = (ChannelNotFoundEncoded) exampleChannelsCompleteConnect404Response.getActualInstance();

        // create a new WorkspaceNotFoundEncoded
        WorkspaceNotFoundEncoded exampleWorkspaceNotFoundEncoded = new WorkspaceNotFoundEncoded();
        // set ChannelsCompleteConnect404Response to WorkspaceNotFoundEncoded
        exampleChannelsCompleteConnect404Response.setActualInstance(exampleWorkspaceNotFoundEncoded);
        // to get back the WorkspaceNotFoundEncoded set earlier
        WorkspaceNotFoundEncoded testWorkspaceNotFoundEncoded = (WorkspaceNotFoundEncoded) exampleChannelsCompleteConnect404Response.getActualInstance();
    }
}
```


