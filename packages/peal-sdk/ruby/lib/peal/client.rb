# frozen_string_literal: true

module Peal
  class Client
    # @param token [String]
    # @param base_url [String, nil]
    # @param max_retries [Integer]
    # @param timeout [Numeric]
    #
    # @return [void]
    def initialize(token:, base_url: nil, max_retries: 2, timeout: 60)
      @raw_client = Peal::Internal::Http::RawClient.new(
        base_url: base_url || Peal::Environment::DEFAULT,
        headers: {
          "X-Fern-Language" => "Ruby",
          Authorization: "Bearer #{token}"
        },
        max_retries: max_retries,
        timeout: timeout
      )
    end

    # @return [Peal::System::Client]
    def system
      @system ||= Peal::System::Client.new(client: @raw_client)
    end

    # @return [Peal::Session::Client]
    def session
      @session ||= Peal::Session::Client.new(client: @raw_client)
    end

    # @return [Peal::Credential::Client]
    def credential
      @credential ||= Peal::Credential::Client.new(client: @raw_client)
    end

    # @return [Peal::APIKeys::Client]
    def api_keys
      @api_keys ||= Peal::APIKeys::Client.new(client: @raw_client)
    end

    # @return [Peal::Channels::Client]
    def channels
      @channels ||= Peal::Channels::Client.new(client: @raw_client)
    end

    # @return [Peal::Posts::Client]
    def posts
      @posts ||= Peal::Posts::Client.new(client: @raw_client)
    end

    # @return [Peal::Media::Client]
    def media
      @media ||= Peal::Media::Client.new(client: @raw_client)
    end

    # @return [Peal::Notices::Client]
    def notices
      @notices ||= Peal::Notices::Client.new(client: @raw_client)
    end

    # @return [Peal::NotificationPreferences::Client]
    def notification_preferences
      @notification_preferences ||= Peal::NotificationPreferences::Client.new(client: @raw_client)
    end

    # @return [Peal::Overview::Client]
    def overview
      @overview ||= Peal::Overview::Client.new(client: @raw_client)
    end

    # @return [Peal::Assistant::Client]
    def assistant
      @assistant ||= Peal::Assistant::Client.new(client: @raw_client)
    end

    # @return [Peal::Members::Client]
    def members
      @members ||= Peal::Members::Client.new(client: @raw_client)
    end

    # @return [Peal::Invitations::Client]
    def invitations
      @invitations ||= Peal::Invitations::Client.new(client: @raw_client)
    end

    # @return [Peal::Billing::Client]
    def billing
      @billing ||= Peal::Billing::Client.new(client: @raw_client)
    end

    # @return [Peal::Usage::Client]
    def usage
      @usage ||= Peal::Usage::Client.new(client: @raw_client)
    end

    # @return [Peal::Analytics::Client]
    def analytics
      @analytics ||= Peal::Analytics::Client.new(client: @raw_client)
    end

    # @return [Peal::Tiktok::Client]
    def tiktok
      @tiktok ||= Peal::Tiktok::Client.new(client: @raw_client)
    end

    # @return [Peal::Capabilities::Client]
    def capabilities
      @capabilities ||= Peal::Capabilities::Client.new(client: @raw_client)
    end

    # @return [Peal::Lookups::Client]
    def lookups
      @lookups ||= Peal::Lookups::Client.new(client: @raw_client)
    end

    # @return [Peal::Webhooks::Client]
    def webhooks
      @webhooks ||= Peal::Webhooks::Client.new(client: @raw_client)
    end

    # @return [Peal::Inbox::Client]
    def inbox
      @inbox ||= Peal::Inbox::Client.new(client: @raw_client)
    end

    # @return [Peal::InboxReviews::Client]
    def inbox_reviews
      @inbox_reviews ||= Peal::InboxReviews::Client.new(client: @raw_client)
    end

    # @return [Peal::Ads::Client]
    def ads
      @ads ||= Peal::Ads::Client.new(client: @raw_client)
    end

    # @return [Peal::Activity::Client]
    def activity
      @activity ||= Peal::Activity::Client.new(client: @raw_client)
    end

    # @return [Peal::Partner::Client]
    def partner
      @partner ||= Peal::Partner::Client.new(client: @raw_client)
    end

    # @return [Peal::PartnerUsage::Client]
    def partner_usage
      @partner_usage ||= Peal::PartnerUsage::Client.new(client: @raw_client)
    end

    # @return [Peal::PartnerAccount::Client]
    def partner_account
      @partner_account ||= Peal::PartnerAccount::Client.new(client: @raw_client)
    end

    # @return [Peal::ConnectLinks::Client]
    def connect_links
      @connect_links ||= Peal::ConnectLinks::Client.new(client: @raw_client)
    end

    # @return [Peal::Review::Client]
    def review
      @review ||= Peal::Review::Client.new(client: @raw_client)
    end

    # @return [Peal::Tags::Client]
    def tags
      @tags ||= Peal::Tags::Client.new(client: @raw_client)
    end

    # @return [Peal::Signatures::Client]
    def signatures
      @signatures ||= Peal::Signatures::Client.new(client: @raw_client)
    end

    # @return [Peal::ChannelSets::Client]
    def channel_sets
      @channel_sets ||= Peal::ChannelSets::Client.new(client: @raw_client)
    end

    # @return [Peal::Queues::Client]
    def queues
      @queues ||= Peal::Queues::Client.new(client: @raw_client)
    end

    # @return [Peal::Recycling::Client]
    def recycling
      @recycling ||= Peal::Recycling::Client.new(client: @raw_client)
    end

    # @return [Peal::Feeds::Client]
    def feeds
      @feeds ||= Peal::Feeds::Client.new(client: @raw_client)
    end

    # @return [Peal::ChannelDefaults::Client]
    def channel_defaults
      @channel_defaults ||= Peal::ChannelDefaults::Client.new(client: @raw_client)
    end

    # @return [Peal::ShortLinks::Client]
    def short_links
      @short_links ||= Peal::ShortLinks::Client.new(client: @raw_client)
    end
  end
end
