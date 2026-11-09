<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Authorization extends JsonSerializableType
{
    /**
     * @var string $authorizationUrl
     */
    #[JsonProperty('authorizationUrl')]
    public string $authorizationUrl;

    /**
     * @param array{
     *   authorizationUrl: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorizationUrl = $values['authorizationUrl'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
