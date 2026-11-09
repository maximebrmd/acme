

# PostsRepost409Response

## anyOf schemas
* [PostStatusConflictEncoded](PostStatusConflictEncoded.md)
* [TargetStatusConflictEncoded](TargetStatusConflictEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.PostsRepost409Response;
import social.peal.model.PostStatusConflictEncoded;
import social.peal.model.TargetStatusConflictEncoded;

public class Example {
    public static void main(String[] args) {
        PostsRepost409Response examplePostsRepost409Response = new PostsRepost409Response();

        // create a new PostStatusConflictEncoded
        PostStatusConflictEncoded examplePostStatusConflictEncoded = new PostStatusConflictEncoded();
        // set PostsRepost409Response to PostStatusConflictEncoded
        examplePostsRepost409Response.setActualInstance(examplePostStatusConflictEncoded);
        // to get back the PostStatusConflictEncoded set earlier
        PostStatusConflictEncoded testPostStatusConflictEncoded = (PostStatusConflictEncoded) examplePostsRepost409Response.getActualInstance();

        // create a new TargetStatusConflictEncoded
        TargetStatusConflictEncoded exampleTargetStatusConflictEncoded = new TargetStatusConflictEncoded();
        // set PostsRepost409Response to TargetStatusConflictEncoded
        examplePostsRepost409Response.setActualInstance(exampleTargetStatusConflictEncoded);
        // to get back the TargetStatusConflictEncoded set earlier
        TargetStatusConflictEncoded testTargetStatusConflictEncoded = (TargetStatusConflictEncoded) examplePostsRepost409Response.getActualInstance();
    }
}
```


