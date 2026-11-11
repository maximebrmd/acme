# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module XReplySettings
      extend Peal::Internal::Types::Enum

      FOLLOWING = "following"
      MENTIONED_USERS = "mentionedUsers"
      SUBSCRIBERS = "subscribers"
      VERIFIED = "verified"
    end
  end
end
