# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Mastodon account, on every part of a thread. Scheduling needs none of them; a content
    # warning counts in the text's limit.
    class MastodonOptions < Internal::Types::Model
      field :content_warning, -> { String }, optional: true, nullable: false, api_name: "contentWarning"

      field :language, -> { String }, optional: true, nullable: false

      field :quote_policy, -> { Peal::Types::MastodonQuotePolicy }, optional: true, nullable: false, api_name: "quotePolicy"

      field :sensitive, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :visibility, -> { Peal::Types::MastodonVisibility }, optional: true, nullable: false
    end
  end
end
