

# TikTokAccountPosting

## anyOf schemas
* [TikTokAccountPostingAnyOf](TikTokAccountPostingAnyOf.md)
* [TikTokAccountPostingAnyOf1](TikTokAccountPostingAnyOf1.md)

## Example
```java
// Import classes:
import social.peal.model.TikTokAccountPosting;
import social.peal.model.TikTokAccountPostingAnyOf;
import social.peal.model.TikTokAccountPostingAnyOf1;

public class Example {
    public static void main(String[] args) {
        TikTokAccountPosting exampleTikTokAccountPosting = new TikTokAccountPosting();

        // create a new TikTokAccountPostingAnyOf
        TikTokAccountPostingAnyOf exampleTikTokAccountPostingAnyOf = new TikTokAccountPostingAnyOf();
        // set TikTokAccountPosting to TikTokAccountPostingAnyOf
        exampleTikTokAccountPosting.setActualInstance(exampleTikTokAccountPostingAnyOf);
        // to get back the TikTokAccountPostingAnyOf set earlier
        TikTokAccountPostingAnyOf testTikTokAccountPostingAnyOf = (TikTokAccountPostingAnyOf) exampleTikTokAccountPosting.getActualInstance();

        // create a new TikTokAccountPostingAnyOf1
        TikTokAccountPostingAnyOf1 exampleTikTokAccountPostingAnyOf1 = new TikTokAccountPostingAnyOf1();
        // set TikTokAccountPosting to TikTokAccountPostingAnyOf1
        exampleTikTokAccountPosting.setActualInstance(exampleTikTokAccountPostingAnyOf1);
        // to get back the TikTokAccountPostingAnyOf1 set earlier
        TikTokAccountPostingAnyOf1 testTikTokAccountPostingAnyOf1 = (TikTokAccountPostingAnyOf1) exampleTikTokAccountPosting.getActualInstance();
    }
}
```


