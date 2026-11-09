

# PostsCreate422Response

## anyOf schemas
* [PostContentInvalidEncoded](PostContentInvalidEncoded.md)
* [UnknownChannelsEncoded](UnknownChannelsEncoded.md)
* [UnknownMediaEncoded](UnknownMediaEncoded.md)

## Example
```java
// Import classes:
import social.peal.model.PostsCreate422Response;
import social.peal.model.PostContentInvalidEncoded;
import social.peal.model.UnknownChannelsEncoded;
import social.peal.model.UnknownMediaEncoded;

public class Example {
    public static void main(String[] args) {
        PostsCreate422Response examplePostsCreate422Response = new PostsCreate422Response();

        // create a new PostContentInvalidEncoded
        PostContentInvalidEncoded examplePostContentInvalidEncoded = new PostContentInvalidEncoded();
        // set PostsCreate422Response to PostContentInvalidEncoded
        examplePostsCreate422Response.setActualInstance(examplePostContentInvalidEncoded);
        // to get back the PostContentInvalidEncoded set earlier
        PostContentInvalidEncoded testPostContentInvalidEncoded = (PostContentInvalidEncoded) examplePostsCreate422Response.getActualInstance();

        // create a new UnknownChannelsEncoded
        UnknownChannelsEncoded exampleUnknownChannelsEncoded = new UnknownChannelsEncoded();
        // set PostsCreate422Response to UnknownChannelsEncoded
        examplePostsCreate422Response.setActualInstance(exampleUnknownChannelsEncoded);
        // to get back the UnknownChannelsEncoded set earlier
        UnknownChannelsEncoded testUnknownChannelsEncoded = (UnknownChannelsEncoded) examplePostsCreate422Response.getActualInstance();

        // create a new UnknownMediaEncoded
        UnknownMediaEncoded exampleUnknownMediaEncoded = new UnknownMediaEncoded();
        // set PostsCreate422Response to UnknownMediaEncoded
        examplePostsCreate422Response.setActualInstance(exampleUnknownMediaEncoded);
        // to get back the UnknownMediaEncoded set earlier
        UnknownMediaEncoded testUnknownMediaEncoded = (UnknownMediaEncoded) examplePostsCreate422Response.getActualInstance();
    }
}
```


