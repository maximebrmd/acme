# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # How a post goes out on a Bluesky account. Scheduling needs none of them; `replies` limited needs one of
    # `replyFollowers`, `replyFollowing` and `replyMentioned`, and the two gates (`replies`, `disableQuotes`) a channel
    # connected since Peal asks for their scopes.
    class BlueskyOptions < Internal::Types::Model
      field :content_label, -> { Peal::Types::BlueskyContentLabel }, optional: true, nullable: false, api_name: "contentLabel"

      field :disable_quotes, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "disableQuotes"

      field :languages, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :replies, -> { Peal::Types::BlueskyReplies }, optional: true, nullable: false

      field :reply_followers, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "replyFollowers"

      field :reply_following, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "replyFollowing"

      field :reply_mentioned, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "replyMentioned"
    end
  end
end
