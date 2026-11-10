<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SignatureDetails extends JsonSerializableType
{
    /**
     * @var ?bool $isDefault
     */
    #[JsonProperty('isDefault')]
    public ?bool $isDefault;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?SignatureScope $scope
     */
    #[JsonProperty('scope')]
    public ?SignatureScope $scope;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   name: string,
     *   text: string,
     *   isDefault?: ?bool,
     *   scope?: ?SignatureScope,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->isDefault = $values['isDefault'] ?? null;
        $this->name = $values['name'];
        $this->scope = $values['scope'] ?? null;
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
