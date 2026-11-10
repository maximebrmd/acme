<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CreatedConnectLink extends JsonSerializableType
{
    /**
     * @var ConnectLink $link
     */
    #[JsonProperty('link')]
    public ConnectLink $link;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   link: ConnectLink,
     *   url: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->link = $values['link'];
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
