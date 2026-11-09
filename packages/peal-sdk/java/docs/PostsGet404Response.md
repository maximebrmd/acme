

# PostsGet404Response

## anyOf schemas
* [PostNotFoundEncoded](PostNotFoundEncoded.md)
* [WorkspaceNotFoundEncoded](WorkspaceNotFoundEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.PostsGet404Response;
import social.peal.model.PostNotFoundEncoded;
import social.peal.model.WorkspaceNotFoundEncoded;

public class Example {
    public static void main(String[] args) {
        PostsGet404Response examplePostsGet404Response = new PostsGet404Response();

        // create a new PostNotFoundEncoded
        PostNotFoundEncoded examplePostNotFoundEncoded = new PostNotFoundEncoded();
        // set PostsGet404Response to PostNotFoundEncoded
        examplePostsGet404Response.setActualInstance(examplePostNotFoundEncoded);
        // to get back the PostNotFoundEncoded set earlier
        PostNotFoundEncoded testPostNotFoundEncoded = (PostNotFoundEncoded) examplePostsGet404Response.getActualInstance();

        // create a new WorkspaceNotFoundEncoded
        WorkspaceNotFoundEncoded exampleWorkspaceNotFoundEncoded = new WorkspaceNotFoundEncoded();
        // set PostsGet404Response to WorkspaceNotFoundEncoded
        examplePostsGet404Response.setActualInstance(exampleWorkspaceNotFoundEncoded);
        // to get back the WorkspaceNotFoundEncoded set earlier
        WorkspaceNotFoundEncoded testWorkspaceNotFoundEncoded = (WorkspaceNotFoundEncoded) examplePostsGet404Response.getActualInstance();
    }
}
```


