# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ChannelConnection
      extend Peal::Internal::Types::Enum

      INSTAGRAM_LOGIN = "instagramLogin"
      FACEBOOK_LOGIN = "facebookLogin"
      LINKEDIN_PROFILE = "linkedinProfile"
      LINKEDIN_PAGE = "linkedinPage"
    end
  end
end
