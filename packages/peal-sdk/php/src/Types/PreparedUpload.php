<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PreparedUpload extends JsonSerializableType
{
    /**
     * @var Media $media
     */
    #[JsonProperty('media')]
    public Media $media;

    /**
     * @var UploadTarget $upload
     */
    #[JsonProperty('upload')]
    public UploadTarget $upload;

    /**
     * @param array{
     *   media: Media,
     *   upload: UploadTarget,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->media = $values['media'];
        $this->upload = $values['upload'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
