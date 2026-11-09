# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InstagramConnection
      extend Peal::Internal::Types::Enum

      INSTAGRAM_LOGIN = "instagramLogin"
      FACEBOOK_LOGIN = "facebookLogin"
    end
  end
end
