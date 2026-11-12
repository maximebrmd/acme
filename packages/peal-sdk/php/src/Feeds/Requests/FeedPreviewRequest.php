<?php

namespace Peal\Feeds\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FeedPreviewRequest extends JsonSerializableType
{
    /**
     * @var ?string $template
     */
    #[JsonProperty('template')]
    public ?string $template;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   url: string,
     *   template?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->template = $values['template'] ?? null;
        $this->url = $values['url'];
    }
}
