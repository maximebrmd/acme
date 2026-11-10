# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TextCapabilities < Internal::Types::Model
      field :forbidden_characters, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "forbiddenCharacters"

      field :limits, -> { Internal::Types::Array[Peal::Types::TextLimit] }, optional: false, nullable: false

      field :max_hashtags, -> { Integer }, optional: false, nullable: true, api_name: "maxHashtags"

      field :max_links, -> { Integer }, optional: false, nullable: true, api_name: "maxLinks"

      field :max_mentions, -> { Integer }, optional: false, nullable: true, api_name: "maxMentions"
    end
  end
end
