

# TargetOptions

What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.

## anyOf schemas
* [TikTokOptions](TikTokOptions.md)
* [YouTubeOptions](YouTubeOptions.md)

## Example
```java
// Import classes:
import social.peal.model.TargetOptions;
import social.peal.model.TikTokOptions;
import social.peal.model.YouTubeOptions;

public class Example {
    public static void main(String[] args) {
        TargetOptions exampleTargetOptions = new TargetOptions();

        // create a new TikTokOptions
        TikTokOptions exampleTikTokOptions = new TikTokOptions();
        // set TargetOptions to TikTokOptions
        exampleTargetOptions.setActualInstance(exampleTikTokOptions);
        // to get back the TikTokOptions set earlier
        TikTokOptions testTikTokOptions = (TikTokOptions) exampleTargetOptions.getActualInstance();

        // create a new YouTubeOptions
        YouTubeOptions exampleYouTubeOptions = new YouTubeOptions();
        // set TargetOptions to YouTubeOptions
        exampleTargetOptions.setActualInstance(exampleYouTubeOptions);
        // to get back the YouTubeOptions set earlier
        YouTubeOptions testYouTubeOptions = (YouTubeOptions) exampleTargetOptions.getActualInstance();
    }
}
```


