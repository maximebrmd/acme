<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CreatedReviewLink extends JsonSerializableType
{
    /**
     * @var ReviewLink $link
     */
    #[JsonProperty('link')]
    public ReviewLink $link;

    /**
     * @var string $token
     */
    #[JsonProperty('token')]
    public string $token;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   link: ReviewLink,
     *   token: string,
     *   url: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->link = $values['link'];
        $this->token = $values['token'];
        $this->url = $values['url'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
