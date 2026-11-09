# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TikTokBlock
      extend Peal::Internal::Types::Enum

      POST_LIMIT = "postLimit"
      BANNED = "banned"
      CLIENT_LIMIT = "clientLimit"
    end
  end
end
