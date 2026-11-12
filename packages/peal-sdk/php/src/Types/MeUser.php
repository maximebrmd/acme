<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MeUser extends JsonSerializableType
{
    /**
     * @var string $email
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @var bool $emailVerified
     */
    #[JsonProperty('emailVerified')]
    public bool $emailVerified;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $image
     */
    #[JsonProperty('image')]
    public ?string $image;

    /**
     * @var value-of<MeUserLocale> $locale
     */
    #[JsonProperty('locale')]
    public string $locale;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var bool $twoStepEnabled
     */
    #[JsonProperty('twoStepEnabled')]
    public bool $twoStepEnabled;

    /**
     * @param array{
     *   email: string,
     *   emailVerified: bool,
     *   id: string,
     *   locale: value-of<MeUserLocale>,
     *   name: string,
     *   twoStepEnabled: bool,
     *   image?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->email = $values['email'];
        $this->emailVerified = $values['emailVerified'];
        $this->id = $values['id'];
        $this->image = $values['image'] ?? null;
        $this->locale = $values['locale'];
        $this->name = $values['name'];
        $this->twoStepEnabled = $values['twoStepEnabled'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
